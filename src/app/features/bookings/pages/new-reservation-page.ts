import { CurrencyPipe } from '@angular/common';
import { Component, computed, inject, resource, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  FormField as SignalFormField,
  FormRoot,
  form,
  pattern,
  required,
  validate,
} from '@angular/forms/signals';
import { toApiError } from '../../../core/http/api-error';
import { UiAlert } from '../../../shared/ui/alert';
import { UiButton } from '../../../shared/ui/button';
import { firstFieldError } from '../../../shared/ui/field-errors';
import { UiFormField } from '../../../shared/ui/form-field';
import { BookingLookupApi } from '../data-access/booking-lookup-api';
import { BookingsApi } from '../data-access/bookings-api';
import {
  BookingContext,
  CANCELLATION_POLICY_LABELS,
  reservationTotal,
  stayNights,
} from '../models/bookings-models';

/** Máximo de noches del contrato (`Reservation.request` y `AvailabilityLockService`). */
const MAX_NIGHTS = 366;

const INTEGER = /^[0-9]+$/;

interface RequestModel {
  from: string;
  to: string;
  occupants: string;
  message: string;
}

function localIsoDate(date: Date): string {
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function addDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

/**
 * Solicitud de reserva (RF-040). Se llega desde el detalle del alojamiento con
 * los parámetros `publication`, `unidad` y, opcionalmente, `desde`/`hasta`/
 * `huespedes`: las fechas que el huésped venía consultando.
 *
 * Las validaciones locales **espejan** las del servidor (`@Future` en las fechas,
 * `to > from`, ≤366 noches y el gate de capacidad) sin inventar reglas nuevas. La
 * autoridad sigue siendo el backend: cualquier rechazo se muestra tal cual
 * (409/403/404/400 + `fieldErrors`).
 */
@Component({
  selector: 'app-new-reservation-page',
  imports: [RouterLink, CurrencyPipe, UiAlert, UiButton, UiFormField, SignalFormField, FormRoot],
  templateUrl: './new-reservation-page.html',
})
export class NewReservationPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(BookingsApi);
  private readonly lookups = inject(BookingLookupApi);

  private readonly queryParams = toSignal(this.route.queryParamMap, { requireSync: true });

  protected readonly publicationId = computed(() => this.queryParams().get('publication') ?? '');
  protected readonly requestedUnitId = computed(() => this.queryParams().get('unidad') ?? '');

  protected readonly contextResource = resource<BookingContext | null, string | null>({
    params: () => (this.publicationId() === '' ? null : this.publicationId()),
    loader: ({ params }) =>
      params === null ? Promise.resolve(null) : this.lookups.bookingContext(params),
  });

  protected readonly context = computed(() => this.contextResource.value() ?? null);
  protected readonly contextLoading = computed(() => this.contextResource.isLoading());
  protected readonly contextError = computed(() => {
    const error = this.contextResource.error();
    return error ? toApiError(error).message : null;
  });

  /** Unidad a solicitar: la de la URL o la del propio contrato leído. */
  protected readonly unitId = computed(
    () => this.requestedUnitId() || this.context()?.unitId || '',
  );

  private readonly today = new Date();
  private readonly tomorrow = localIsoDate(addDays(this.today, 1));

  private readonly model = signal<RequestModel>({
    from: this.queryParams().get('desde') ?? this.tomorrow,
    to: this.queryParams().get('hasta') ?? localIsoDate(addDays(this.today, 8)),
    occupants: this.queryParams().get('huespedes') ?? '1',
    message: '',
  });

  protected readonly submitting = signal(false);
  protected readonly actionError = signal<string | null>(null);
  protected readonly verificationGate = signal(false);
  protected readonly serverFields = signal<Record<string, string>>({});

  protected readonly requestForm = form(
    this.model,
    (path) => {
      required(path.from, { message: 'Indica la fecha de entrada.' });
      required(path.to, { message: 'Indica la fecha de salida.' });
      required(path.occupants, { message: 'Indica cuántos huéspedes viajan.' });

      // `@Future` en el contrato: hoy tampoco vale (debe ser una fecha futura).
      validate(path.from, ({ value }) =>
        value() !== '' && value() < this.tomorrow
          ? {
              kind: 'past-date',
              message: 'La entrada debe ser futura (el servidor rechaza hoy y fechas pasadas).',
            }
          : null,
      );

      validate(path.to, ({ value, valueOf }) => {
        if (value() === '') {
          return null;
        }
        if (value() <= valueOf(path.from)) {
          return { kind: 'range', message: 'La salida debe ser posterior a la entrada.' };
        }
        return stayNights(valueOf(path.from), value()) > MAX_NIGHTS
          ? { kind: 'too-long', message: `La estancia máxima admitida es de ${MAX_NIGHTS} noches.` }
          : null;
      });

      pattern(path.occupants, INTEGER, { message: 'Usa un número entero de huéspedes.' });
      validate(path.occupants, ({ value }) => {
        if (value() === '' || !INTEGER.test(value())) {
          return null;
        }
        const occupants = Number(value());
        if (occupants < 1) {
          return { kind: 'min-occupants', message: 'Debe viajar al menos 1 huésped.' };
        }
        const maxGuests = this.context()?.maxGuests;
        return maxGuests !== undefined && occupants > maxGuests
          ? { kind: 'capacity', message: `La unidad admite como máximo ${maxGuests} huésped(es).` }
          : null;
      });
    },
    {
      submission: {
        action: async () => {
          await this.submit();
          return undefined;
        },
      },
    },
  );

  protected readonly fromError = computed(() =>
    this.fieldError('fromDate', firstFieldError(this.requestForm.from)),
  );
  protected readonly toError = computed(() =>
    this.fieldError('toDate', firstFieldError(this.requestForm.to)),
  );
  protected readonly occupantsError = computed(() =>
    this.fieldError('occupants', firstFieldError(this.requestForm.occupants)),
  );

  /** Los `fieldErrors` del backend mandan sobre la validación local del mismo campo. */
  private fieldError(apiKey: string, localError: string | null): string | null {
    return this.serverFields()[apiKey] ?? localError;
  }

  protected readonly nights = computed(() => {
    const { from, to } = this.model();
    return from === '' || to === '' || to <= from ? 0 : stayNights(from, to);
  });

  /** Previsualización con el precio vigente; el snapshot real lo fija el servidor (RN-07). */
  protected readonly estimated = computed(() => {
    const context = this.context();
    if (!context || context.pricePerNight <= 0 || this.nights() === 0) {
      return null;
    }
    return reservationTotal(context.pricePerNight, this.nights());
  });

  protected readonly policyLabels = CANCELLATION_POLICY_LABELS;
  protected readonly maxNights = MAX_NIGHTS;

  /** Sin precio configurado el backend responde 404 al crear (lo advertimos antes). */
  protected readonly missingPricing = computed(() => {
    const context = this.context();
    return context !== null && context.pricePerNight <= 0;
  });

  protected retryContext(): void {
    this.contextResource.reload();
  }

  private async submit(): Promise<void> {
    const unitId = this.unitId();
    if (unitId === '' || this.context() === null) {
      this.actionError.set('Falta el alojamiento a solicitar: entra desde su ficha de detalle.');
      return;
    }
    this.submitting.set(true);
    this.actionError.set(null);
    this.verificationGate.set(false);
    this.serverFields.set({});
    const { from, to, occupants, message } = this.model();
    try {
      await this.api.create({
        unitId,
        fromDate: from,
        toDate: to,
        occupants: Number(occupants),
        message: message.trim() === '' ? null : message.trim(),
      });
      await this.router.navigate(['/reservas']);
    } catch (error) {
      this.handleCreateError(error);
    } finally {
      this.submitting.set(false);
    }
  }

  /** Refleja la respuesta real del backend sin reinterpretarla (no se resuelve concurrencia en cliente). */
  private handleCreateError(error: unknown): void {
    const apiError = toApiError(error);
    this.serverFields.set(apiError.fieldErrors);
    switch (apiError.status) {
      case 409:
        this.actionError.set(
          `El servidor no aceptó la solicitud (${apiError.code}): ${apiError.message}. ` +
            'Puede que esas fechas ya no estén libres o que la publicación no admita solicitudes ahora mismo.',
        );
        break;
      case 403:
        this.verificationGate.set(true);
        this.actionError.set(
          `El servidor denegó la solicitud (403): ${apiError.message}. Suele ser por no tener un rol ` +
            'de huésped activo o por no tener la verificación de identidad completa (un documento aprobado).',
        );
        break;
      case 404:
        this.actionError.set(
          'La API no encontró una unidad reservable: hacen falta publicación y precio configurados ' +
            '(el backend no distingue cuál de los dos falta).',
        );
        break;
      default:
        this.actionError.set(apiError.message);
    }
  }
}
