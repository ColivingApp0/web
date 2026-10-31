import { HttpClient } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { API_BASE } from '../http/api-base';

export type PushPlatform = 'WEB' | 'ANDROID' | 'IOS';

/** Projection returned by the backend; the raw FCM token is never echoed. */
export interface PushTokenView {
  id: string;
  platform: PushPlatform;
  createdAt: string;
  lastSeenAt: string;
}

/**
 * Device registration for the external push channel (RF-051).
 * The FCM token itself is produced by `PushNotifications`; this service only
 * persists/removes it for the authenticated user.
 */
@Service()
export class PushApi {
  private readonly http = inject(HttpClient);

  register(token: string): Promise<PushTokenView> {
    return firstValueFrom(
      this.http.post<PushTokenView>(`${API_BASE}/users/me/push-tokens`, {
        token,
        platform: 'WEB' satisfies PushPlatform,
      }),
    );
  }

  unregister(token: string): Promise<void> {
    return firstValueFrom(
      this.http.delete<void>(`${API_BASE}/users/me/push-tokens`, { params: { token } }),
    );
  }
}
