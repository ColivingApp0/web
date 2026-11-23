import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthSession } from './auth-session';
import { RoleCode } from './identity-contract';

/**
 * Guards de navegación (UX, no control de acceso: la autorización real es del backend).
 * `authGuard` protege la zona autenticada; `guestGuard` evita que una sesión activa
 * vea las páginas de acceso; `roleGuard` limita las zonas por rol activo
 * (p. ej. el área de anfitrión exige `ANFITRION`).
 */

export const authGuard: CanActivateFn = (_route, state) => {
  const session = inject(AuthSession);
  if (session.isAuthenticated()) return true;
  return inject(Router).createUrlTree(['/entrar'], { queryParams: { returnUrl: state.url } });
};

export const guestGuard: CanActivateFn = () => {
  const session = inject(AuthSession);
  if (!session.isAuthenticated()) return true;
  return inject(Router).createUrlTree(['/perfil']);
};

/**
 * La portada es contenido de marketing para invitados. Con sesión activa, el
 * «home» real es el catálogo (`/alojamientos`), que muestra las habitaciones
 * publicadas y aplica los filtros contra el backend.
 */
export const homeGuard: CanActivateFn = () => {
  const session = inject(AuthSession);
  if (!session.isAuthenticated()) return true;
  return inject(Router).createUrlTree(['/alojamientos']);
};

export function roleGuard(...roles: readonly RoleCode[]): CanActivateFn {
  return (_route, state) => {
    const session = inject(AuthSession);
    if (!session.isAuthenticated()) {
      return inject(Router).createUrlTree(['/entrar'], {
        queryParams: { returnUrl: state.url },
      });
    }
    const activeRole = session.activeRole()?.code;
    if (activeRole !== undefined && roles.includes(activeRole)) return true;
    // Sin el rol requerido se explica el motivo y se ofrece cambiar de rol.
    return inject(Router).createUrlTree(['/acceso-restringido'], {
      queryParams: { recurso: state.url },
    });
  };
}
