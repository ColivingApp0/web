import { HttpClient, HttpParams } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { API_BASE } from '../../../core/http/api-base';
import {
  ActivityDetailView,
  ActivityView,
  CommunitySummaryView,
  CreateActivityPayload,
  ParticipantView,
} from '../models/community-models';

/**
 * Endpoints del contexto `community` (RF-060, RF-061, RF-062).
 *
 * Residente (`/api/v1/community/**`, cualquier autenticado): la pertenencia a la
 * comunidad autorizada la decide el servicio a partir de la fila de participante
 * (403 si no se está habilitado).
 * Anfitrión (`/api/v1/host/community/activities/**`, rol `ANFITRION`): crear,
 * listar, ver y cancelar las actividades de sus propiedades.
 */
@Service()
export class CommunityApi {
  private readonly http = inject(HttpClient);

  // ---------- Residente ----------

  listMyActivities(): Promise<ActivityView[]> {
    return firstValueFrom(this.http.get<ActivityView[]>(`${API_BASE}/community/activities`));
  }

  activityDetail(activityId: string): Promise<ActivityDetailView> {
    return firstValueFrom(
      this.http.get<ActivityDetailView>(`${API_BASE}/community/activities/${activityId}`),
    );
  }

  confirmAttendance(activityId: string): Promise<ParticipantView> {
    return firstValueFrom(
      this.http.post<ParticipantView>(
        `${API_BASE}/community/activities/${activityId}/confirm`,
        null,
      ),
    );
  }

  withdrawFromActivity(activityId: string): Promise<ParticipantView> {
    return firstValueFrom(
      this.http.post<ParticipantView>(
        `${API_BASE}/community/activities/${activityId}/withdraw`,
        null,
      ),
    );
  }

  /** Resumen agregado de una propiedad (solo contadores, gated por consentimiento). */
  communitySummary(propertyId: string): Promise<CommunitySummaryView> {
    return firstValueFrom(
      this.http.get<CommunitySummaryView>(`${API_BASE}/community/summary`, {
        params: new HttpParams({ fromObject: { propertyId } }),
      }),
    );
  }

  // ---------- Anfitrión ----------

  listHostActivities(): Promise<ActivityView[]> {
    return firstValueFrom(this.http.get<ActivityView[]>(`${API_BASE}/host/community/activities`));
  }

  hostActivityDetail(activityId: string): Promise<ActivityDetailView> {
    return firstValueFrom(
      this.http.get<ActivityDetailView>(`${API_BASE}/host/community/activities/${activityId}`),
    );
  }

  createActivity(payload: CreateActivityPayload): Promise<ActivityDetailView> {
    return firstValueFrom(
      this.http.post<ActivityDetailView>(`${API_BASE}/host/community/activities`, payload),
    );
  }

  cancelActivity(activityId: string): Promise<ActivityView> {
    return firstValueFrom(
      this.http.post<ActivityView>(
        `${API_BASE}/host/community/activities/${activityId}/cancel`,
        null,
      ),
    );
  }
}
