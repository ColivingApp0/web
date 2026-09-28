import { Component, computed, inject, resource, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { toApiError } from '../../../core/http/api-error';
import { UiAlert } from '../../../shared/ui/alert';
import { UiButton } from '../../../shared/ui/button';
import { BookingsApi } from '../data-access/bookings-api';
import { GuestReservationAction, ReservationView } from '../models/bookings-models';
import { ReservationActionEvent, ReservationCard } from '../ui/reservation-card';

/**
 * «Mis reservas» (huésped): lista las reservas propias (`GET /reservations/mine`)
 * y permite las dos acciones del huésped: confirmar dentro del hold provisional
 * y cancelar con motivo.
 *
 * Estado mínimo a propósito: la reserva es estado del servidor y de vida corta,
 * así que no hay store compartido; basta un `resource()` que se recarga tras
 * cada acción (el backend es quien decide si la transición era posible).
 */
@Component({
  selector: 'app-my-reservations-page',
  imports: [RouterLink, UiAlert, UiButton, ReservationCard],
  templateUrl: './my-reservations-page.html',
})
export class MyReservationsPage {
  private readonly api = inject(BookingsApi);

  protected readonly listResource = resource({ loader: () => this.api.listMine() });
  protected readonly reservations = computed(() => this.listResource.value() ?? []);
  protected readonly loading = computed(() => this.listResource.isLoading());
  protected readonly loadError = computed(() => {
    const error = this.listResource.error();
    return error ? toApiError(error).message : null;
  });

  protected readonly actionError = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);
  protected readonly busyReservationId = signal<string | null>(null);
  protected readonly busyAction = signal<string | null>(null);

  protected retry(): void {
    this.listResource.reload();
  }

  protected async run(reservation: ReservationView, event: ReservationActionEvent): Promise<void> {
    const action = event.action as GuestReservationAction;
    this.actionError.set(null);
    this.successMessage.set(null);
    this.busyReservationId.set(reservation.id);
    this.busyAction.set(action);
    try {
      if (action === 'confirm') {
        await this.api.confirm(reservation.id);
        this.successMessage.set('Reserva confirmada. ¡Ya tienes tu estadía asegurada!');
      } else if (event.reason !== null) {
        await this.api.cancel(reservation.id, event.reason);
        this.successMessage.set('Reserva cancelada. Los días quedan libres de nuevo.');
      }
      this.listResource.reload();
    } catch (error) {
      const apiError = toApiError(error);
      if (apiError.status === 409) {
        this.actionError.set(
          `El servidor rechazó la acción (${apiError.code}): ${apiError.message}. ` +
            'La reserva pudo expirar o cambiar de estado; la lista se actualizó.',
        );
        this.listResource.reload();
      } else if (apiError.status === 403) {
        this.actionError.set(
          'No eres la parte de esta reserva, así que no puedes operar sobre ella.',
        );
      } else if (apiError.status === 404) {
        this.actionError.set('La reserva ya no existe. Actualizamos la lista.');
        this.listResource.reload();
      } else {
        this.actionError.set(apiError.message);
      }
    } finally {
      this.busyReservationId.set(null);
      this.busyAction.set(null);
    }
  }
}
