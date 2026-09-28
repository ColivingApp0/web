import { Component, computed, inject, resource, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { toApiError } from '../../../core/http/api-error';
import { UiAlert } from '../../../shared/ui/alert';
import { UiButton } from '../../../shared/ui/button';
import { BookingLookupApi } from '../data-access/booking-lookup-api';
import { BookingsApi } from '../data-access/bookings-api';
import {
  HostReservationAction,
  HostUnitRef,
  ReservationEventView,
  ReservationView,
} from '../models/bookings-models';
import { ReservationActionEvent, ReservationCard } from '../ui/reservation-card';

/**
 * Bandeja de reservas del anfitrión (`GET /host/reservations`, rol `ANFITRION`):
 * decisiones reales (`accept`/`reject`/`request-info`), cancelación compartida e
 * historial por reserva (`GET /host/reservations/{id}/history`, solo anfitrión).
 *
 * Los nombres de unidad se resuelven con los endpoints **propios del anfitrión**
 * (`/host/properties[/{id}/units]`): nunca se reconstruyen publicaciones desde
 * rutas públicas (ver ADR-005).
 */
@Component({
  selector: 'app-host-reservations-page',
  imports: [RouterLink, UiAlert, UiButton, ReservationCard],
  templateUrl: './host-reservations-page.html',
})
export class HostReservationsPage {
  private readonly api = inject(BookingsApi);
  private readonly lookups = inject(BookingLookupApi);

  protected readonly listResource = resource({ loader: () => this.api.listIncoming() });
  protected readonly reservations = computed(() => this.listResource.value() ?? []);
  protected readonly loading = computed(() => this.listResource.isLoading());
  protected readonly loadError = computed(() => {
    const error = this.listResource.error();
    return error ? toApiError(error).message : null;
  });

  private readonly unitsResource = resource({ loader: () => this.lookups.hostUnits() });
  private readonly unitsById = computed(() => {
    const index = new Map<string, HostUnitRef>();
    for (const unit of this.unitsResource.value() ?? []) {
      index.set(unit.unitId, unit);
    }
    return index;
  });

  protected readonly actionError = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);
  protected readonly busyReservationId = signal<string | null>(null);
  protected readonly busyAction = signal<string | null>(null);

  private readonly histories = signal<Record<string, ReservationEventView[]>>({});
  private readonly historiesLoading = signal<Record<string, boolean>>({});

  protected unitName(reservation: ReservationView): string | null {
    return this.unitsById().get(reservation.unitId)?.name ?? null;
  }

  protected unitLink(reservation: ReservationView): string[] | null {
    const unit = this.unitsById().get(reservation.unitId);
    return unit === undefined
      ? null
      : ['/anfitrion/propiedades', unit.propertyId, 'unidades', unit.unitId];
  }

  protected historyOf(reservation: ReservationView): readonly ReservationEventView[] | null {
    return this.histories()[reservation.id] ?? null;
  }

  protected historyLoading(reservation: ReservationView): boolean {
    return this.historiesLoading()[reservation.id] === true;
  }

  protected retry(): void {
    this.listResource.reload();
  }

  protected async toggleHistory(reservation: ReservationView): Promise<void> {
    if (this.histories()[reservation.id] !== undefined) {
      return;
    }
    this.markHistoryLoading(reservation.id, true);
    try {
      const events = await this.api.history(reservation.id);
      this.histories.update((current) => ({ ...current, [reservation.id]: events }));
    } catch (error) {
      const apiError = toApiError(error);
      this.actionError.set(
        apiError.status === 403
          ? 'Solo el huésped y el anfitrión pueden ver el historial de esta reserva.'
          : apiError.message,
      );
    } finally {
      this.markHistoryLoading(reservation.id, false);
    }
  }

  protected async run(reservation: ReservationView, event: ReservationActionEvent): Promise<void> {
    const action = event.action as HostReservationAction;
    this.actionError.set(null);
    this.successMessage.set(null);
    this.busyReservationId.set(reservation.id);
    this.busyAction.set(action);
    try {
      if (action === 'accept') {
        await this.api.accept(reservation.id, event.reason);
        this.successMessage.set(
          'Solicitud aceptada: los días quedaron bloqueados y el huésped tiene un plazo para confirmar.',
        );
      } else if (action === 'reject') {
        await this.api.reject(reservation.id, event.reason);
        this.successMessage.set('Solicitud rechazada.');
      } else if (action === 'request-info') {
        await this.api.requestInfo(reservation.id, event.reason);
        this.successMessage.set('Se pidió más información al huésped.');
      } else if (event.reason !== null) {
        await this.api.cancelAsHost(reservation.id, event.reason);
        this.successMessage.set('Reserva cancelada y días liberados.');
      }
      this.refresh(reservation.id);
    } catch (error) {
      const apiError = toApiError(error);
      if (apiError.status === 409) {
        this.actionError.set(
          `El servidor rechazó la acción (${apiError.code}): ${apiError.message}. ` +
            'Es posible que esas fechas ya estén tomadas o que la reserva haya cambiado de estado; ' +
            'la lista se actualizó con el estado real.',
        );
        this.refresh(reservation.id);
      } else if (apiError.status === 403) {
        this.actionError.set(
          'No eres el anfitrión de esa unidad, así que no puedes decidir sobre ella.',
        );
      } else if (apiError.status === 404) {
        this.actionError.set('La reserva ya no existe: actualizamos la lista.');
        this.listResource.reload();
      } else {
        this.actionError.set(apiError.message);
      }
    } finally {
      this.busyReservationId.set(null);
      this.busyAction.set(null);
    }
  }

  /** Tras una transición cambian tanto el estado como el historial de esa reserva. */
  private refresh(reservationId: string): void {
    this.histories.update((current) => {
      if (current[reservationId] === undefined) {
        return current;
      }
      const copy = { ...current };
      delete copy[reservationId];
      return copy;
    });
    this.listResource.reload();
  }

  private markHistoryLoading(reservationId: string, value: boolean): void {
    this.historiesLoading.update((current) => ({ ...current, [reservationId]: value }));
  }
}
