#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# ColivinApp — arranque local + publicación del cliente en GitHub Codespaces.
#
# Uso:
#   ./dev.sh              # levanta todo (PostgreSQL, API, cliente y enlace)
#   ./dev.sh up           # igual que sin argumentos
#   ./dev.sh status       # muestra estado y enlace público
#   ./dev.sh logs         # últimas líneas de los logs
#   ./dev.sh down         # detiene cliente/API y el reenvío; conserva PostgreSQL
#   ./dev.sh down --with-db
#   ./dev.sh restart      # down + up
#
# No requiere editar variables para el flujo normal de Codespaces.
# Los logs y PIDs viven en /tmp/colivin-dev (no se agregan al repositorio).
# ---------------------------------------------------------------------------
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

RUN_DIR="${TMPDIR:-/tmp}/colivin-dev"
mkdir -p "$RUN_DIR"

API_PORT="${API_PORT:-8082}"
WEB_PORT="${WEB_PORT:-8080}"
FORWARD_LOCAL_PORT="${FORWARD_LOCAL_PORT:-18080}"

API_PID="$RUN_DIR/api.pid"
WEB_PID="$RUN_DIR/web.pid"
FORWARD_PID="$RUN_DIR/forward.pid"
API_LOG="$RUN_DIR/api.log"
WEB_LOG="$RUN_DIR/web.log"
FORWARD_LOG="$RUN_DIR/forward.log"

bold() { printf '\033[1m%s\033[0m\n' "$*"; }
info() { printf '  %s\n' "$*"; }
warn() { printf '  ⚠ %s\n' "$*" >&2; }
fail() { printf '  ✖ %s\n' "$*" >&2; exit 1; }

kill_group() {
  local pidfile="$1"
  [ -f "$pidfile" ] || return 0
  local pid
  pid="$(cat "$pidfile" 2>/dev/null || true)"
  [ -n "$pid" ] || { rm -f "$pidfile"; return 0; }
  if kill -0 "$pid" 2>/dev/null; then
    kill -- "-$pid" 2>/dev/null || kill "$pid" 2>/dev/null || true
  fi
  rm -f "$pidfile"
}

port_in_use() {
  ss -ltn 2>/dev/null | grep -qE "[:.]$1[[:space:]]"
}

http_code() {
  curl -s -o /dev/null -w '%{http_code}' --max-time 3 "$1" 2>/dev/null || true
}

api_ok() {
  local code
  code="$(http_code "http://127.0.0.1:${API_PORT}/api/v1/publications")"
  [ "$code" = "401" ] || [ "$code" = "403" ] || [ "$code" = "200" ]
}

web_ok() {
  [ "$(http_code "http://127.0.0.1:${WEB_PORT}/")" = "200" ]
}

wait_for() {
  local label="$1" check="$2" attempts="${3:-60}"
  local i
  for ((i = 1; i <= attempts; i++)); do
    if "$check"; then
      return 0
    fi
    sleep 1
  done
  fail "$label no respondió en ${attempts}s. Revisa: $RUN_DIR"
}

stop_app() {
  kill_group "$WEB_PID"
  kill_group "$API_PID"
  # Respaldo para procesos lanzados fuera de este script.
  fuser -k "${WEB_PORT}/tcp" >/dev/null 2>&1 || true
  fuser -k "${API_PORT}/tcp" >/dev/null 2>&1 || true
  sleep 1
}

stop_forward() {
  kill_group "$FORWARD_PID"
}

start_db() {
  bold "1/4 · PostgreSQL"
  (cd api && docker compose up -d)
  local i
  for ((i = 1; i <= 30; i++)); do
    if docker inspect --format '{{.State.Health.Status}}' coliving-postgres 2>/dev/null | grep -qx healthy; then
      info "PostgreSQL listo en :5432"
      return 0
    fi
    sleep 1
  done
  fail "PostgreSQL no alcanzó estado healthy."
}

start_api() {
  bold "2/4 · API"
  if api_ok; then
    info "API ya estaba respondiendo en :${API_PORT}"
    return 0
  fi
  port_in_use "$API_PORT" && fail "El puerto ${API_PORT} está ocupado por otro proceso (¿Adminer?)."
  info "Arrancando API en :${API_PORT}…"
  (
    cd api
    setsid env JAVA_TOOL_OPTIONS="${JAVA_TOOL_OPTIONS:--Xmx512m}" \
      ./gradlew bootRun >"$API_LOG" 2>&1 < /dev/null &
    echo $! >"$API_PID"
  )
  wait_for "La API" api_ok 90
  info "API lista: http://localhost:${API_PORT}/api/v1"
}

start_web() {
  bold "3/4 · Cliente"
  if web_ok; then
    info "Cliente ya estaba respondiendo en :${WEB_PORT}"
    return 0
  fi
  port_in_use "$WEB_PORT" && fail "El puerto ${WEB_PORT} está ocupado por otro proceso."
  info "Compilando y arrancando cliente en :${WEB_PORT} (sin watch)…"
  setsid npx ng serve --host 0.0.0.0 --port "$WEB_PORT" --no-watch \
    >"$WEB_LOG" 2>&1 < /dev/null &
  echo $! >"$WEB_PID"
  wait_for "El cliente" web_ok 90
  info "Cliente listo: http://localhost:${WEB_PORT}/"
}

public_url() {
  if [ -n "${CODESPACE_NAME:-}" ] && [ -n "${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN:-}" ]; then
    printf 'https://%s-%s.%s' "$CODESPACE_NAME" "$WEB_PORT" "$GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN"
  fi
}

port_registered() {
  command -v gh >/dev/null 2>&1 || return 1
  [ -n "${CODESPACE_NAME:-}" ] || return 1
  gh codespace ports -c "$CODESPACE_NAME" --json sourcePort --jq '.[].sourcePort' 2>/dev/null \
    | grep -qx "$WEB_PORT"
}

ensure_forward() {
  bold "4/4 · Enlace público"
  if ! command -v gh >/dev/null 2>&1 || [ -z "${CODESPACE_NAME:-}" ]; then
    warn "No hay gh/Codespaces; se omite el enlace público."
    return 0
  fi
  if ! gh auth status >/dev/null 2>&1; then
    warn "gh no está autenticado; se omite el enlace público."
    return 0
  fi

  if ! port_registered; then
    # Busca un puerto local libre para el túnel de gh.
    while port_in_use "$FORWARD_LOCAL_PORT"; do
      FORWARD_LOCAL_PORT=$((FORWARD_LOCAL_PORT + 1))
    done
    info "Registrando ${WEB_PORT} en el túnel (local ${FORWARD_LOCAL_PORT})…"
    setsid gh codespace ports forward "${WEB_PORT}:${FORWARD_LOCAL_PORT}" \
      -c "$CODESPACE_NAME" >"$FORWARD_LOG" 2>&1 < /dev/null &
    echo $! >"$FORWARD_PID"
    local i
    for ((i = 1; i <= 15; i++)); do
      port_registered && break
      sleep 1
    done
  fi

  if ! port_registered; then
    warn "No se pudo registrar el puerto ${WEB_PORT}. Revisa $FORWARD_LOG"
    return 0
  fi

  gh codespace ports visibility "${WEB_PORT}:public" -c "$CODESPACE_NAME" >/dev/null 2>&1 || true
  local url
  url="$(public_url)"
  if [ -n "$url" ]; then
    info "Enlace público: $url"
    info "Si aparece el aviso de Codespaces, pulsa «Continue» una vez."
  else
    warn "No se pudo construir la URL pública."
  fi
}

status() {
  bold "Estado de ColivinApp"
  docker inspect --format '  PostgreSQL: {{.State.Health.Status}}' coliving-postgres 2>/dev/null || warn "PostgreSQL no está creado."
  if api_ok; then info "API:  OK  http://localhost:${API_PORT}/api/v1"; else warn "API:  sin respuesta en :${API_PORT}"; fi
  if web_ok; then info "Cliente: OK http://localhost:${WEB_PORT}/"; else warn "Cliente: sin respuesta en :${WEB_PORT}"; fi
  if command -v gh >/dev/null 2>&1 && [ -n "${CODESPACE_NAME:-}" ]; then
    gh codespace ports -c "$CODESPACE_NAME" 2>/dev/null | sed 's/^/  /' || true
    local url; url="$(public_url)"
    [ -n "$url" ] && info "Enlace: $url"
  fi
  info "Logs: $RUN_DIR"
}

show_logs() {
  bold "Últimas líneas de logs"
  printf '\n--- API ---\n'
  tail -n 60 "$API_LOG" 2>/dev/null || warn "Sin log de API todavía."
  printf '\n--- Cliente ---\n'
  tail -n 40 "$WEB_LOG" 2>/dev/null || warn "Sin log de cliente todavía."
  printf '\n--- Túnel ---\n'
  tail -n 20 "$FORWARD_LOG" 2>/dev/null || true
}

up() {
  bold "ColivinApp · arranque de desarrollo"
  start_db
  if api_ok && web_ok; then
    info "API y cliente ya estaban en marcha; no se reinician."
  else
    stop_app
    start_api
    start_web
  fi
  ensure_forward
  printf '\n'
  status
  printf '\n'
  bold "Listo. Usa «./dev.sh logs» si algo no responde."
}

down() {
  bold "Deteniendo ColivinApp"
  stop_app
  stop_forward
  info "Cliente, API y túnel detenidos."
  if [ "${1:-}" = "--with-db" ]; then
    (cd api && docker compose down)
    info "PostgreSQL detenido (los datos se conservan)."
  else
    info "PostgreSQL se mantiene en marcha."
  fi
}

case "${1:-up}" in
  up) up ;;
  restart) down; up ;;
  down) down "${2:-}" ;;
  status) status ;;
  logs) show_logs ;;
  *)
    cat <<'EOF'
Uso:
  ./dev.sh              Levanta PostgreSQL, API, cliente y enlace público.
  ./dev.sh up           Igual.
  ./dev.sh status       Estado actual.
  ./dev.sh logs         Últimos logs.
  ./dev.sh down         Detiene app y túnel (conserva PostgreSQL).
  ./dev.sh down --with-db
  ./dev.sh restart
EOF
    exit 1
    ;;
esac
