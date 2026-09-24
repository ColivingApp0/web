import { HttpClient } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { API_BASE } from '../../../core/http/api-base';
import { RegisterRequest, RegisterResult, ResetPasswordRequest } from '../models/auth-models';

/**
 * Flujos públicos de identidad que no forman parte del ciclo de sesión
 * (registro, verificación de correo y restablecimiento de contraseña).
 * Login/logout/me/rol viven en `core/auth` (`SessionApi`).
 */
@Service()
export class AuthApi {
  private readonly http = inject(HttpClient);

  register(request: RegisterRequest): Promise<RegisterResult> {
    return firstValueFrom(this.http.post<RegisterResult>(`${API_BASE}/auth/register`, request));
  }

  verifyEmail(token: string): Promise<void> {
    return firstValueFrom(this.http.post<void>(`${API_BASE}/auth/verify-email`, { token }));
  }

  requestPasswordReset(email: string): Promise<void> {
    return firstValueFrom(
      this.http.post<void>(`${API_BASE}/auth/password-reset/request`, { email }),
    );
  }

  resetPassword(request: ResetPasswordRequest): Promise<void> {
    return firstValueFrom(this.http.post<void>(`${API_BASE}/auth/password-reset`, request));
  }
}
