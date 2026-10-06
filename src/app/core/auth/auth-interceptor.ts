import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthSession } from './auth-session';

/** Rutas públicas de autenticación: un 401 aquí es feedback del formulario, no sesión caída. */
const GUEST_PREFIXES = [
  '/entrar',
  '/registro',
  '/verificar-correo',
  '/recuperar',
  '/restablecer-password',
];

/**
 * Prefijo de las rutas del backend propio (`API_BASE` = `/api/v1`). Solo a estas
 * peticiones se les adjunta el token de sesión; las llamadas a APIs de terceros
 * (p. ej. API-Colombia) nunca deben recibir la credencial de ColivinApp.
 */
const BACKEND_PREFIX = '/api/';

/**
 * Adjunta `Authorization: Bearer <token>` cuando hay sesión y gestiona el 401:
 * limpia la sesión y devuelve al usuario a `/entrar` (con `returnUrl`) si estaba
 * en una zona autenticada. Los 401 de los propios endpoints de `/auth/` se dejan
 * pasar para que cada página muestre su error.
 *
 * El token se limita a las rutas del backend propio y su 401 solo se maneja en
 * ellas: una respuesta 401 de un tercero no debe cerrar la sesión de ColivinApp.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const session = inject(AuthSession);
  const router = inject(Router);

  const targetsBackend = req.url.startsWith(BACKEND_PREFIX);
  const token = targetsBackend ? session.token() : null;
  const authorized = token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;

  return next(authorized).pipe(
    catchError((error: unknown) => {
      if (targetsBackend && error instanceof HttpErrorResponse && error.status === 401) {
        const wasAuthenticated = session.isAuthenticated();
        session.clear();
        const isAuthEndpoint = req.url.includes('/auth/');
        if (wasAuthenticated && !isAuthEndpoint && shouldRedirect(router.url)) {
          void router.navigate(['/entrar'], { queryParams: { returnUrl: router.url } });
        }
      }
      return throwError(() => error);
    }),
  );
};

function shouldRedirect(url: string): boolean {
  if (url === '/') return false;
  return !GUEST_PREFIXES.some((prefix) => url.startsWith(prefix));
}
