import { HttpClient } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { API_BASE } from '../../../core/http/api-base';
import {
  CreateReservationPayload,
  ReservationEventView,
  ReservationView,
} from '../models/bookings-models';

/**
 * Endpoints del contexto `booking` (RF-040..RF-044).
 *
 * Huésped (`/api/v1/reservations`, requiere rol activo `HUESPED_*`):
 * crear, listar las propias, confirmar dentro del hold y cancelar.
 * Anfitrión (`/api/v1/host/reservations`, requiere rol activo `ANFITRION`):
 * bandeja de recibidas, historial y decisiones (aceptar/rechazar/pedir info) +
 * cancelación compartida.
 *
 * Los permisos, los gates (verificación, publicación `PUBLICADA`, disponibilidad)
 * y la concurrencia los aplica el backend; aquí solo se invoca el contrato real.
 */
@Service()
export class BookingsApi {
  private readonly http = inject(HttpClient);

  // ---------- Huésped ----------

  create(payload: CreateReservationPayload): Promise<ReservationView> {
    return firstValueFrom(this.http.post<ReservationView>(`${API_BASE}/reservations`, payload));
  }

  listMine(): Promise<ReservationView[]> {
    return firstValueFrom(this.http.get<ReservationView[]>(`${API_BASE}/reservations/mine`));
  }

  confirm(reservationId: string): Promise<ReservationView> {
    return firstValueFrom(
      this.http.post<ReservationView>(`${API_BASE}/reservations/${reservationId}/confirm`, null),
    );
  }

  cancel(reservationId: string, reason: string): Promise<ReservationView> {
    return firstValueFrom(
      this.http.post<ReservationView>(`${API_BASE}/reservations/${reservationId}/cancel`, {
        reason,
      }),
    );
  }

  // ---------- Anfitrión ----------

  listIncoming(): Promise<ReservationView[]> {
    return firstValueFrom(this.http.get<ReservationView[]>(`${API_BASE}/host/reservations`));
  }

  history(reservationId: string): Promise<ReservationEventView[]> {
    return firstValueFrom(
      this.http.get<ReservationEventView[]>(
        `${API_BASE}/host/reservations/${reservationId}/history`,
      ),
    );
  }

  accept(reservationId: string, reason: string | null): Promise<ReservationView> {
    return firstValueFrom(
      this.http.post<ReservationView>(`${API_BASE}/host/reservations/${reservationId}/accept`, {
        reason,
      }),
    );
  }

  reject(reservationId: string, reason: string | null): Promise<ReservationView> {
    return firstValueFrom(
      this.http.post<ReservationView>(`${API_BASE}/host/reservations/${reservationId}/reject`, {
        reason,
      }),
    );
  }

  requestInfo(reservationId: string, reason: string | null): Promise<ReservationView> {
    return firstValueFrom(
      this.http.post<ReservationView>(
        `${API_BASE}/host/reservations/${reservationId}/request-info`,
        { reason },
      ),
    );
  }

  cancelAsHost(reservationId: string, reason: string): Promise<ReservationView> {
    return firstValueFrom(
      this.http.post<ReservationView>(`${API_BASE}/host/reservations/${reservationId}/cancel`, {
        reason,
      }),
    );
  }
}
