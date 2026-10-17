import { HttpClient } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { API_BASE } from '../../../core/http/api-base';
import {
  CreateReservationPayload,
  ReservationEventView,
  ReservationView,
} from '../models/bookings-models';

/** Endpoints de solicitudes mensuales (huésped y anfitrión). */
@Service()
export class BookingsApi {
  private readonly http = inject(HttpClient);

  create(payload: CreateReservationPayload): Promise<ReservationView> {
    return firstValueFrom(this.http.post<ReservationView>(`${API_BASE}/reservations`, payload));
  }

  listMine(): Promise<ReservationView[]> {
    return firstValueFrom(this.http.get<ReservationView[]>(`${API_BASE}/reservations/mine`));
  }

  cancel(reservationId: string, reason: string): Promise<ReservationView> {
    return firstValueFrom(
      this.http.post<ReservationView>(`${API_BASE}/reservations/${reservationId}/cancel`, {
        reason,
      }),
    );
  }

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
