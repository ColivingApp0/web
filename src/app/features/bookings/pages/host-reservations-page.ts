import { DatePipe } from '@angular/common';
import { Component, computed, inject, resource, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { toApiError } from '../../../core/http/api-error';
import { UiAlert } from '../../../shared/ui/alert';
import { UiButton } from '../../../shared/ui/button';
import { UiEmptyState } from '../../../shared/ui/empty-state';
import { UiFormField } from '../../../shared/ui/form-field';
import { UiIcon } from '../../../shared/ui/icon';
import { UiPageHeader } from '../../../shared/ui/page-header';
import { BookingsApi } from '../data-access/bookings-api';
import {
  HostReservationAction,
  RESERVATION_EVENT_LABELS,
  ReservationEventView,
  ReservationView,
  hostReservationActions,
} from '../models/bookings-models';
import { ReservationCard } from '../ui/reservation-card';

type Filter = 'PENDIENTES' | 'TODAS';

/** Bandeja de solicitudes recibidas por el anfitrión y sus decisiones. */
@Component({
  selector: 'app-host-reservations-page',
  imports: [
    RouterLink,
    DatePipe,
    UiAlert,
    UiButton,
    UiEmptyState,
    UiFormField,
    UiIcon,
    UiPageHeader,
    ReservationCard,
  ],
  templateUrl: './host-reservations-page.html',
})
export class HostReservationsPage {
  private readonly api = inject(BookingsApi);

  protected readonly listResource = resource({ loader: () => this.api.listIncoming() });
  protected readonly loading = computed(() => this.listResource.isLoading());
  protected readonly loadError = computed(() => {
    const error = this.listResource.error();
    return error ? toApiError(error).message : null;
  });
  protected readonly reservations = computed(() => this.listResource.value() ?? []);
  protected readonly filter = signal<Filter>('PENDIENTES');
  protected readonly filtered = computed(() =>
    this.filter() === 'PENDIENTES'
      ? this.reservations().filter(
          (item) => item.status === 'SOLICITADA' || item.status === 'INFORMACION_SOLICITADA',
        )
      : this.reservations(),
  );
  protected readonly pendingCount = computed(
    () => this.reservations().filter((item) => item.status === 'SOLICITADA').length,
  );

  protected readonly actionError = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);
  protected readonly busyReservationId = signal<string | null>(null);

  protected readonly decisionTarget = signal<{
    reservation: ReservationView;
    action: HostReservationAction;
  } | null>(null);
  protected readonly decisionReason = signal('');
  protected readonly decisionError = signal<string | null>(null);

  private readonly histories = signal<Record<string, ReservationEventView[]>>({});
  private readonly historiesLoading = signal<Record<string, boolean>>({});

  protected actions(reservation: ReservationView) {
    return hostReservationActions(reservation.status);
  }

  protected requiresReason(action: HostReservationAction): boolean {
    return action !== 'accept';
  }

  protected startDecision(reservation: ReservationView, action: HostReservationAction): void {
    if (action === 'accept') {
      void this.run(reservation, 'accept', null);
      return;
    }
    this.decisionTarget.set({ reservation, action });
    this.decisionReason.set('');
    this.decisionError.set(null);
  }

  protected closeDecision(): void {
    this.decisionTarget.set(null);
    this.decisionReason.set('');
    this.decisionError.set(null);
  }

  protected updateReason(event: Event): void {
    if (event.target instanceof HTMLTextAreaElement) this.decisionReason.set(event.target.value);
  }

  protected confirmDecision(): void {
    const target = this.decisionTarget();
    if (!target) return;
    if (this.decisionReason().trim() === '') {
      this.decisionError.set('Indica un motivo para esta acción.');
      return;
    }
    void this.run(target.reservation, target.action, this.decisionReason().trim());
  }

  protected async run(
    reservation: ReservationView,
    action: HostReservationAction,
    reason: string | null,
  ): Promise<void> {
    this.busyReservationId.set(reservation.id);
    this.actionError.set(null);
    this.successMessage.set(null);
    this.decisionError.set(null);
    try {
      if (action === 'accept') {
        await this.api.accept(reservation.id, reason);
        this.successMessage.set('Solicitud aceptada: la plaza queda ocupada de inmediato.');
      } else if (action === 'reject') {
        await this.api.reject(reservation.id, reason);
        this.successMessage.set('Solicitud rechazada. No se ocupó ninguna plaza.');
      } else if (action === 'request-info') {
        await this.api.requestInfo(reservation.id, reason);
        this.successMessage.set('Se pidió más información al huésped.');
      } else {
        await this.api.cancelAsHost(reservation.id, reason ?? 'Cancelada por el anfitrión');
        this.successMessage.set('Solicitud cancelada. La plaza vuelve a quedar libre.');
      }
      this.closeDecision();
      this.clearHistory(reservation.id);
      this.listResource.reload();
    } catch (error) {
      const apiError = toApiError(error);
      const message =
        apiError.status === 409
          ? `${apiError.message}. La lista se actualizó con el estado real de la habitación.`
          : apiError.status === 403
            ? 'No eres el anfitrión de esa habitación.'
            : apiError.status === 404
              ? 'La solicitud ya no existe.'
              : apiError.message;
      this.decisionError.set(message);
      this.actionError.set(message);
      this.listResource.reload();
    } finally {
      this.busyReservationId.set(null);
    }
  }

  protected historyOf(reservation: ReservationView): readonly ReservationEventView[] | null {
    return this.histories()[reservation.id] ?? null;
  }

  protected historyLoading(reservation: ReservationView): boolean {
    return this.historiesLoading()[reservation.id] === true;
  }

  protected eventLabel(event: ReservationEventView): string {
    return RESERVATION_EVENT_LABELS[event.type];
  }

  protected async toggleHistory(reservation: ReservationView): Promise<void> {
    if (this.histories()[reservation.id] !== undefined) {
      this.clearHistory(reservation.id);
      return;
    }
    this.historiesLoading.update((current) => ({ ...current, [reservation.id]: true }));
    try {
      const events = await this.api.history(reservation.id);
      this.histories.update((current) => ({ ...current, [reservation.id]: events }));
    } catch (error) {
      this.actionError.set(toApiError(error).message);
    } finally {
      this.historiesLoading.update((current) => ({ ...current, [reservation.id]: false }));
    }
  }

  private clearHistory(reservationId: string): void {
    this.histories.update((current) => {
      const copy = { ...current };
      delete copy[reservationId];
      return copy;
    });
  }

  protected retry(): void {
    this.listResource.reload();
  }
}
