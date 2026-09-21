import {
  ApplicationConfig,
  LOCALE_ID,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideClientHydration } from '@angular/platform-browser';
import { routes } from './app.routes';
import { AuthSession } from './core/auth/auth-session';
import { authInterceptor } from './core/auth/auth-interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideClientHydration(),
    provideHttpClient(withInterceptors([authInterceptor])),
    // Formato regional es-CO (fechas, moneda) en toda la aplicación.
    { provide: LOCALE_ID, useValue: 'es-CO' },
    provideAppInitializer(() => {
      // Restaura la sesión persistida (solo navegador) y sincroniza el usuario actual.
      const session = inject(AuthSession);
      session.restore();
      void session.refresh();
    }),
  ],
};
