import { HttpClient } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { API_BASE } from '../../../core/http/api-base';
import {
  ConfigurePrivacyPayload,
  ProfileView,
  UpdateProfilePayload,
} from '../models/profile-models';

/** Perfil y privacidad del usuario autenticado (ProfileController). */
@Service()
export class ProfileApi {
  private readonly http = inject(HttpClient);

  get(): Promise<ProfileView> {
    return firstValueFrom(this.http.get<ProfileView>(`${API_BASE}/profile`));
  }

  update(payload: UpdateProfilePayload): Promise<ProfileView> {
    return firstValueFrom(this.http.patch<ProfileView>(`${API_BASE}/profile`, payload));
  }

  configurePrivacy(payload: ConfigurePrivacyPayload): Promise<ProfileView> {
    return firstValueFrom(this.http.put<ProfileView>(`${API_BASE}/profile/privacy`, payload));
  }
}
