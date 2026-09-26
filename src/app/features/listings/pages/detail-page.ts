import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, computed, inject, resource, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormField as SignalFormField, FormRoot, form } from '@angular/forms/signals';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthSession } from '../../../core/auth/auth-session';
import { toApiError } from '../../../core/http/api-error';
import { UiAlert } from '../../../shared/ui/alert';
import { UiButton } from '../../../shared/ui/button';
import { UiFormField } from '../../../shared/ui/form-field';
import { ListingsApi } from '../data-access/listings-api';
import {
  AvailabilityState,
  CancellationPolicy,
  DayAvailabilityView,
} from '../models/listings-models';
import { FavoritesStore } from '../state/favorites-store';

const POLICY_LABELS: Record<CancellationPolicy, string> = {
  FLEXIBLE: 'Flexible',
  MODERADA: 'Moderada',
  ESTRICTA: 'Estricta',
};

const STATE_META: Record<AvailabilityState, { label: string; classes: string }> = {
  DISPONIBLE: { label: 'Disponible', classes: 'bg-brand-700/10 text-brand-800' },
  BLOQUEADO: { label: 'No disponible', classes: 'bg-accent-500/15 text-accent-600' },
  OCUPADO: { label: 'Ocupado', classes: 'bg-red-100 text-red-800' },
};

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

interface DatesModel {
  from: string;
  to: string;
}

/**
 * Detalle de una publicación (RF-033) y su disponibilidad día a día
 * (`GET /publications/{id}/availability`, intervalo [from, to)).
 */
@Component({
  selector: 'app-detail-page',
  imports: [
    RouterLink,
    CurrencyPipe,
    DatePipe,
    UiAlert,
    UiButton,
    UiFormField,
    SignalFormField,
    FormRoot,
  ],
  templateUrl: './detail-page.html',
})
export class DetailPage {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(ListingsApi);
  protected readonly favorites = inject(FavoritesStore);
  protected readonly session = inject(AuthSession);

  constructor() {
    void this.favorites.load();
  }

  private readonly params = toSignal(this.route.paramMap, { requireSync: true });
  protected readonly publicationId = computed(() => this.params().get('id') ?? '');

  protected readonly detailResource = resource({
    params: () => this.publicationId(),
    loader: ({ params }) => this.api.detail(params),
  });

  protected readonly detail = computed(() => this.detailResource.value() ?? null);
  protected readonly loading = computed(() => this.detailResource.isLoading());
  protected readonly errorMessage = computed(() => {
    const error = this.detailResource.error();
    if (!error) return null;
    const apiError = toApiError(error);
    return apiError.code === 'NOT_FOUND'
      ? 'No encontramos este alojamiento: puede haberse pausado, archivado o no existir.'
      : apiError.message;
  });

  protected readonly policyLabels = POLICY_LABELS;

  private readonly today = new Date();
  private readonly datesModel = signal<DatesModel>({
    from: isoDate(this.today),
    to: isoDate(addDays(this.today, 14)),
  });

  protected readonly datesForm = form(this.datesModel, {
    submission: {
      action: async () => {
        await this.loadAvailability();
        return undefined;
      },
    },
  });

  protected readonly availability = signal<readonly DayAvailabilityView[] | null>(null);
  protected readonly availabilityLoading = signal(false);
  protected readonly availabilityError = signal<string | null>(null);

  /** Fechas que el huésped está consultando: se trasladan a la solicitud de reserva. */
  protected readonly selectedDates = computed(() => this.datesModel());

  /** El usuario tiene algún rol de huésped activo (mismo criterio que el backend). */
  protected readonly hasGuestRole = computed(() =>
    (this.session.user()?.roles ?? []).some(
      (role) => role.active && role.code.startsWith('HUESPED'),
    ),
  );

  /**
   * El backend solo admite solicitudes sobre publicaciones `PUBLICADA` con precio
   * configurado (RN-03 + `UnitBookingQuery`) y con rol de huésped activo; el CTA se
   * muestra solo cuando esas condiciones reales se cumplen.
   */
  protected readonly canRequestReservation = computed(() => {
    const detail = this.detail();
    return (
      detail !== null &&
      detail.publication.status === 'PUBLICADA' &&
      detail.pricing !== null &&
      this.hasGuestRole()
    );
  });

  protected stateLabel(state: AvailabilityState): string {
    return STATE_META[state].label;
  }

  protected stateClasses(state: AvailabilityState): string {
    return STATE_META[state].classes;
  }

  protected formatTime(value: string): string {
    return value.slice(0, 5);
  }

  protected retry(): void {
    this.detailResource.reload();
  }

  private async loadAvailability(): Promise<void> {
    const { from, to } = this.datesModel();
    if (from === '' || to === '') {
      this.availabilityError.set('Indica las fechas «desde» y «hasta».');
      return;
    }
    if (to <= from) {
      this.availabilityError.set('La fecha «hasta» debe ser posterior a «desde».');
      return;
    }
    this.availabilityLoading.set(true);
    this.availabilityError.set(null);
    try {
      this.availability.set(await this.api.availability(this.publicationId(), from, to));
    } catch (error) {
      this.availabilityError.set(toApiError(error).message);
      this.availability.set(null);
    } finally {
      this.availabilityLoading.set(false);
    }
  }
}
