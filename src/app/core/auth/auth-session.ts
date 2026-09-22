import { isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID, Service, computed, inject, signal } from '@angular/core';
import { CurrentUserResult, LoginResult, RoleCode, UserRoleSummary } from './identity-contract';
import { SessionApi } from './session-api';

const STORAGE_KEY = 'colivinapp.session';

interface StoredSession {
  token: string;
  expiresAt: string;
  user: CurrentUserResult | null;
}

function isStoredSession(value: unknown): value is StoredSession {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  return typeof record['token'] === 'string' && typeof record['expiresAt'] === 'string';
}

/**
 * Estado transversal de la sesión (único estado global real del frontend).
 *
 * - El token es opaco y se persiste en `localStorage` para sobrevivir recargas
 *   (el backend mantiene la sesión 30 días por dispositivo; no hay renovación).
 * - `restore()` se ejecuta en el arranque (app initializer) y `refresh()` trae
 *   el usuario actual (`GET /users/me`).
 * - El manejo de 401 y el envío del header viven en `authInterceptor`/guards,
 *   no aquí.
 */
@Service()
export class AuthSession {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly api = inject(SessionApi);

  private readonly state = signal<StoredSession | null>(null);

  readonly token = computed(() => this.state()?.token ?? null);
  readonly user = computed(() => this.state()?.user ?? null);
  readonly activeRole = computed<UserRoleSummary | null>(() => this.user()?.activeRole ?? null);
  readonly emailVerified = computed(() => this.user()?.emailVerified ?? false);
  readonly hasActiveRole = computed(() => this.activeRole() !== null);

  readonly isAuthenticated = computed(() => {
    const session = this.state();
    return session !== null && Date.parse(session.expiresAt) > Date.now();
  });

  /** Carga la sesión persistida (solo navegador); descarta sesiones expiradas o corruptas. */
  restore(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    try {
      const parsed: unknown = JSON.parse(raw);
      if (!isStoredSession(parsed) || Date.parse(parsed.expiresAt) <= Date.now()) {
        localStorage.removeItem(STORAGE_KEY);
        return;
      }
      this.state.set(parsed);
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  /** Registra la sesión recién creada y sincroniza el usuario actual en segundo plano. */
  setSession(result: LoginResult): void {
    this.persist({ token: result.token, expiresAt: result.expiresAt, user: null });
    void this.refresh();
  }

  clear(): void {
    this.state.set(null);
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  /** Refresca el usuario actual (`GET /users/me`). Un 401 lo gestiona el interceptor. */
  async refresh(): Promise<void> {
    const current = this.state();
    if (!current) return;
    try {
      const user = await this.api.me();
      const session = this.state();
      if (session && session.token === current.token) {
        this.persist({ ...session, user });
      }
    } catch {
      // El interceptor limpia la sesión ante 401; el resto de errores no bloquea la UI.
    }
  }

  /** Cambia el rol activo (RF-004) y refleja el resultado en la sesión. */
  async selectRole(code: RoleCode): Promise<UserRoleSummary> {
    const result = await this.api.selectRole(code);
    const current = this.state();
    if (current?.user) {
      const exists = current.user.roles.some((role) => role.roleId === result.activeRole.roleId);
      const roles = current.user.roles.map((role) => ({
        ...role,
        active: role.roleId === result.activeRole.roleId,
      }));
      if (!exists) roles.push(result.activeRole);
      this.persist({
        ...current,
        user: { ...current.user, roles, activeRole: result.activeRole },
      });
    }
    return result.activeRole;
  }

  /** Revoca la sesión en el backend (idempotente) y limpia el estado local siempre. */
  async logout(): Promise<void> {
    try {
      await this.api.logout();
    } catch {
      // La sesión local se limpia aunque el backend no confirme la revocación.
    } finally {
      this.clear();
    }
  }

  private persist(session: StoredSession): void {
    this.state.set(session);
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    }
  }
}
