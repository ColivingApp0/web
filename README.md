# ColivinApp — cliente Angular

Frontend de **ColivinApp**, una aplicación de **renta mensual de habitaciones**.
El cliente Angular está en este repositorio; la API Kotlin/Spring vive en `api/`.

## Requisitos

- Node.js 24+ y npm.
- Java 21+.
- Docker (PostgreSQL local).

## Arranque local

```bash
# 1. Base de datos
cd api
docker compose up -d

# 2. API (:8082 en perfil dev)
./gradlew bootRun

# 3. Cliente (:8080, proxy /api → :8082)
cd ..
npm start
```

Abre `http://localhost:8080/`.

- Swagger de la API: `http://localhost:8082/swagger-ui/index.html`.
- Liquibase aplica las migraciones al arrancar la API.
- En el perfil `dev` se siembran datos de prueba reproducibles (ver más abajo).
- El puerto 8080 se usa para el cliente porque es el que se expone en GitHub
  Codespaces; `proxy.conf.json` envía `/api` al backend en 8082.

## Datos de desarrollo

La semilla se ejecuta al arrancar la API con `app.seed.enabled=true` (por defecto
en `dev`) y es idempotente:

- **Anfitriones** (contraseña `Host123!`): `ana@colivin.dev`, `carlos@colivin.dev`,
  `lucia@colivin.dev`, `diego@colivin.dev`.
- **Huéspedes** (contraseña `Guest123!`): `huesped01@colivin.dev` …
  `huesped16@colivin.dev`.
- 8 propiedades, 17 habitaciones y 20 solicitudes con escenarios variados
  (vacías, últimas plazas, completas, pausadas, individuales y compartidas).
- Las fotos están en `public/images/rooms/` y los avatares en
  `public/images/avatars/`.

## Comandos

```bash
npm start                 # dev server :8080
npm run build             # build de producción
npx ng test --watch=false # Vitest
npx prettier --check .    # formato
```

## Documentación

- `docs/frontend-development-guide.md` — convenciones, sistema visual, contratos
  mensuales, accesibilidad y pruebas.
- `api/docs/` — diseño de los contextos accommodation, booking, search y mensajería.
