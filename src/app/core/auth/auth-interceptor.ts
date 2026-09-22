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
 * Adjunta `Authorization: Bearer <token>` cuando hay sesión y gestiona el 401:
 * limpia la sesión y devuelve al usuario a `/entrar` (con `returnUrl`) si estaba
 * en una zona autenticada. Los 401 de los propios endpoints de `/auth/` se dejan
 * pasar para que cada página muestre su error.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const session = inject(AuthSession);
  const router = inject(Router);

  const token = session.token();
  const authorized = token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;

  return next(authorized).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && error.status === 401) {
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
