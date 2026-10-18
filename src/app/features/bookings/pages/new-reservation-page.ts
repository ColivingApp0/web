import { CurrencyPipe } from '@angular/common';
import { Component, computed, inject, resource, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormField as SignalFormField, FormRoot, form, validate } from '@angular/forms/signals';
import { toApiError } from '../../../core/http/api-error';
import { UiAlert } from '../../../shared/ui/alert';
import { UiButton } from '../../../shared/ui/button';
import { firstFieldError } from '../../../shared/ui/field-errors';
import { UiFormField } from '../../../shared/ui/form-field';
import { UiIcon } from '../../../shared/ui/icon';
import { BookingLookupApi } from '../data-access/booking-lookup-api';
import { BookingsApi } from '../data-access/bookings-api';
import { BookingContext, priceUnitLabel } from '../models/bookings-models';

interface RequestModel {
  message: string;
}

/**
 * Solicitud de una plaza mensual. No hay fechas ni noches: se solicita una
 * plaza de la habitación y el anfitrión decide. El backend valida plazas,
 * publicación y verificación.
 */
@Component({
  selector: 'app-new-reservation-page',
  imports: [
    RouterLink,
    CurrencyPipe,
    UiAlert,
    UiButton,
    UiFormField,
    UiIcon,
    SignalFormField,
    FormRoot,
  ],
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

  private readonly model = signal<RequestModel>({ message: '' });
  protected readonly submitting = signal(false);
  protected readonly actionError = signal<string | null>(null);
  protected readonly verificationGate = signal(false);

  protected readonly requestForm = form(
    this.model,
    (path) => {
      validate(path.message, ({ value }) =>
        value().length > 600
          ? { kind: 'message-length', message: 'El mensaje no puede superar 600 caracteres.' }
          : null,
      );
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

  protected readonly messageError = computed(() => firstFieldError(this.requestForm.message));
  protected readonly canSubmit = computed(() => {
    const context = this.context();
    return context !== null && context.effectiveAvailable;
  });
  protected readonly priceUnit = computed(() => priceUnitLabel(this.context()?.priceUnit ?? null));

  protected retryContext(): void {
    this.contextResource.reload();
  }

  private async submit(): Promise<void> {
    const context = this.context();
    if (!context) {
      this.actionError.set('Falta la habitación a solicitar: entra desde su ficha de detalle.');
      return;
    }
    this.submitting.set(true);
    this.actionError.set(null);
    this.verificationGate.set(false);
    try {
      await this.api.create({
        unitId: this.requestedUnitId() || context.unitId,
        places: 1,
        message: this.model().message.trim() || null,
      });
      await this.router.navigate(['/reservas'], { queryParams: { enviada: '1' } });
    } catch (error) {
      const apiError = toApiError(error);
      if (apiError.status === 403) {
        this.verificationGate.set(true);
        this.actionError.set(
          `${apiError.message}. Necesitas un rol de huésped activo y verificación completa (un documento aprobado).`,
        );
      } else if (apiError.status === 409) {
        this.actionError.set(
          `${apiError.message}. Actualiza la ficha de la habitación y revisa las plazas libres.`,
        );
      } else if (apiError.status === 404) {
        this.actionError.set('La API ya no encuentra esta habitación publicada.');
      } else {
        this.actionError.set(apiError.message);
      }
    } finally {
      this.submitting.set(false);
    }
  }
}
