import { HttpClient } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { API_BASE } from '../http/api-base';
import { CurrentUserResult, LoginResult, RoleCode, SelectRoleResult } from './identity-contract';

/**
 * Operaciones del ciclo de vida de la sesión contra el backend real:
 * login (crea sesión), logout (la revoca), me (refresca el usuario actual)
 * y selección del rol activo (RF-004).
 *
 * El envío del token y el manejo de 401 viven en `authInterceptor`.
 */
@Service()
export class SessionApi {
  private readonly http = inject(HttpClient);

  login(email: string, password: string): Promise<LoginResult> {
    return firstValueFrom(
      this.http.post<LoginResult>(`${API_BASE}/auth/login`, {
        email,
        password,
        deviceLabel: 'web',
      }),
    );
  }

  logout(): Promise<void> {
    return firstValueFrom(this.http.post<void>(`${API_BASE}/auth/logout`, null));
  }

  me(): Promise<CurrentUserResult> {
    return firstValueFrom(this.http.get<CurrentUserResult>(`${API_BASE}/users/me`));
  }

  selectRole(roleCode: RoleCode): Promise<SelectRoleResult> {
    return firstValueFrom(
      this.http.put<SelectRoleResult>(`${API_BASE}/users/me/role`, { roleCode }),
    );
  }
}
