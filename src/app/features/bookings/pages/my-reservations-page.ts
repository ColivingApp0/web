import { Component, computed, inject, resource, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toApiError } from '../../../core/http/api-error';
import { UiAlert } from '../../../shared/ui/alert';
import { UiButton } from '../../../shared/ui/button';
import { UiEmptyState } from '../../../shared/ui/empty-state';
import { UiFormField } from '../../../shared/ui/form-field';
import { UiIcon } from '../../../shared/ui/icon';
import { UiPageHeader } from '../../../shared/ui/page-header';
import { BookingsApi } from '../data-access/bookings-api';
import { ReservationStatus, ReservationView, isActiveReservation } from '../models/bookings-models';
import { ReservationCard } from '../ui/reservation-card';

type Filter = 'TODAS' | 'PENDIENTES' | 'ACEPTADAS' | 'CERRADAS';

const FILTERS: readonly { value: Filter; label: string }[] = [
  { value: 'TODAS', label: 'Todas' },
  { value: 'PENDIENTES', label: 'Pendientes' },
  { value: 'ACEPTADAS', label: 'Aceptadas' },
  { value: 'CERRADAS', label: 'Cerradas' },
];

const PENDING: readonly ReservationStatus[] = ['SOLICITADA', 'INFORMACION_SOLICITADA'];
const ACCEPTED: readonly ReservationStatus[] = ['ACEPTADA', 'CONFIRMADA'];

/** Solicitudes del huésped, con su estado real y cancelación con motivo. */
@Component({
  selector: 'app-my-reservations-page',
  imports: [
    RouterLink,
    UiAlert,
    UiButton,
    UiEmptyState,
    UiFormField,
    UiIcon,
    UiPageHeader,
    ReservationCard,
  ],
  templateUrl: './my-reservations-page.html',
})
export class MyReservationsPage {
  private readonly api = inject(BookingsApi);
  private readonly route = inject(ActivatedRoute);
  private readonly queryParams = toSignal(this.route.queryParamMap, { requireSync: true });

  protected readonly successFromCreate = computed(() => this.queryParams().get('enviada') === '1');
  protected readonly filters = FILTERS;
  protected readonly filter = signal<Filter>('TODAS');

  protected readonly listResource = resource({ loader: () => this.api.listMine() });
  protected readonly loading = computed(() => this.listResource.isLoading());
  protected readonly loadError = computed(() => {
    const error = this.listResource.error();
    return error ? toApiError(error).message : null;
  });
  protected readonly reservations = computed(() => this.listResource.value() ?? []);
  protected readonly filtered = computed(() => {
    const filter = this.filter();
    const items = this.reservations();
    if (filter === 'PENDIENTES') return items.filter((item) => PENDING.includes(item.status));
    if (filter === 'ACEPTADAS') return items.filter((item) => ACCEPTED.includes(item.status));
    if (filter === 'CERRADAS') return items.filter((item) => !isActiveReservation(item.status));
    return items;
  });

  protected readonly cancelTarget = signal<string | null>(null);
  protected readonly cancelReason = signal('');
  protected readonly cancelError = signal<string | null>(null);
  protected readonly cancelSuccess = signal<string | null>(null);
  protected readonly cancelling = signal(false);

  protected count(filter: Filter): number {
    const items = this.reservations();
    if (filter === 'PENDIENTES')
      return items.filter((item) => PENDING.includes(item.status)).length;
    if (filter === 'ACEPTADAS')
      return items.filter((item) => ACCEPTED.includes(item.status)).length;
    if (filter === 'CERRADAS')
      return items.filter((item) => !isActiveReservation(item.status)).length;
    return items.length;
  }

  protected canCancel(reservation: ReservationView): boolean {
    return isActiveReservation(reservation.status);
  }

  protected startCancel(reservation: ReservationView): void {
    this.cancelTarget.set(reservation.id);
    this.cancelReason.set('');
    this.cancelError.set(null);
    this.cancelSuccess.set(null);
  }

  protected closeCancel(): void {
    this.cancelTarget.set(null);
    this.cancelReason.set('');
    this.cancelError.set(null);
  }

  protected updateReason(event: Event): void {
    if (event.target instanceof HTMLTextAreaElement) this.cancelReason.set(event.target.value);
  }

  protected async confirmCancel(reservationId: string): Promise<void> {
    const reason = this.cancelReason().trim();
    if (reason === '') {
      this.cancelError.set('Indica el motivo de la cancelación.');
      return;
    }
    this.cancelling.set(true);
    this.cancelError.set(null);
    try {
      await this.api.cancel(reservationId, reason);
      this.cancelSuccess.set(
        'Solicitud cancelada. La plaza vuelve a quedar libre si estaba aceptada.',
      );
      this.cancelTarget.set(null);
      this.cancelReason.set('');
      this.listResource.reload();
    } catch (error) {
      this.cancelError.set(toApiError(error).message);
    } finally {
      this.cancelling.set(false);
    }
  }

  protected retry(): void {
    this.listResource.reload();
  }
}
