import { Component, computed, inject, input, linkedSignal, output, signal } from '@angular/core';
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
import { UiIcon } from '../../../shared/ui/icon';
import { HostApi } from '../data-access/host-api';
import {
  CreateUnitPayload,
  HostBathroomType,
  HostCurrency,
  HostPriceUnit,
  HostRoomType,
  HostUnit,
} from '../models/host-models';

interface UnitFormModel {
  name: string;
  description: string;
  roomType: HostRoomType;
  maxGuests: string;
  monthlyPrice: string;
  currency: HostCurrency;
  priceUnit: HostPriceUnit;
  bathroomType: HostBathroomType;
  airConditioning: boolean;
  fan: boolean;
  commonAreas: string;
}

const POSITIVE_INT = /^[1-9][0-9]*$/;
const POSITIVE_AMOUNT = /^[1-9][0-9]*(\.[0-9]{1,2})?$/;

/** Alta y edición de una habitación con su precio mensual y características propias. */
@Component({
  selector: 'app-host-unit-form',
  imports: [UiAlert, UiButton, UiFormField, UiIcon, SignalFormField, FormRoot],
  templateUrl: './unit-form.html',
})
export class HostUnitForm {
  readonly propertyId = input.required<string>();
  readonly unit = input<HostUnit | null>(null);
  readonly saved = output<HostUnit>();

  private readonly api = inject(HostApi);

  protected readonly submitting = signal(false);
  protected readonly serverError = signal<string | null>(null);
  protected readonly serverFieldErrors = signal<Record<string, string>>({});
  protected readonly isEdit = computed(() => this.unit() !== null);

  private readonly model = linkedSignal<UnitFormModel>(() => {
    const unit = this.unit();
    return {
      name: unit?.name ?? '',
      description: unit?.description ?? '',
      roomType: unit?.roomType ?? 'INDIVIDUAL',
      maxGuests: unit ? String(unit.maxGuests) : '1',
      monthlyPrice: unit?.monthlyPrice != null ? String(unit.monthlyPrice) : '',
      currency: unit?.currency ?? 'COP',
      priceUnit: unit?.priceUnit ?? 'POR_HABITACION',
      bathroomType: unit?.bathroomType ?? 'COMPARTIDO',
      airConditioning: unit?.airConditioning ?? false,
      fan: unit?.fan ?? false,
      commonAreas: (unit?.commonAreas ?? []).join(', '),
    };
  });

  protected readonly unitForm = form(
    this.model,
    (path) => {
      required(path.name, { message: 'El nombre de la habitación es obligatorio.' });
      required(path.maxGuests, { message: 'Indica la capacidad.' });
      pattern(path.maxGuests, POSITIVE_INT, {
        message: 'La capacidad debe ser un entero mayor que 0.',
      });
      validate(path.maxGuests, ({ value, valueOf }) => {
        if (!POSITIVE_INT.test(value())) return null;
        if (valueOf(path.roomType) === 'INDIVIDUAL' && Number(value()) !== 1) {
          return {
            kind: 'individual-capacity',
            message: 'Una habitación individual debe tener exactamente 1 plaza.',
          };
        }
        return null;
      });
      validate(path.monthlyPrice, ({ value }) =>
        value().trim() !== '' && !POSITIVE_AMOUNT.test(value())
          ? { kind: 'price', message: 'Usa un importe positivo, por ejemplo 780000.' }
          : null,
      );
    },
    {
      submission: {
        action: async () => {
          await this.save();
          return undefined;
        },
      },
    },
  );

  protected readonly nameError = computed(
    () => firstFieldError(this.unitForm.name) ?? this.serverFieldErrors()['name'] ?? null,
  );
  protected readonly capacityError = computed(() => firstFieldError(this.unitForm.maxGuests));
  protected readonly priceError = computed(
    () =>
      firstFieldError(this.unitForm.monthlyPrice) ??
      this.serverFieldErrors()['monthlyPrice'] ??
      null,
  );

  private async save(): Promise<void> {
    this.submitting.set(true);
    this.serverError.set(null);
    this.serverFieldErrors.set({});
    try {
      const model = this.model();
      const payload: CreateUnitPayload = {
        name: model.name.trim(),
        description: model.description.trim() || null,
        maxGuests: Number(model.maxGuests),
        monthlyPrice: model.monthlyPrice.trim() === '' ? null : Number(model.monthlyPrice),
        currency: model.currency,
        priceUnit: model.roomType === 'INDIVIDUAL' ? 'POR_HABITACION' : model.priceUnit,
        roomType: model.roomType,
        bathroomType: model.bathroomType,
        airConditioning: model.airConditioning,
        fan: model.fan,
        commonAreas: model.commonAreas
          .split(',')
          .map((area) => area.trim())
          .filter((area) => area !== ''),
      };
      const existing = this.unit();
      const saved = existing
        ? await this.api.updateUnit(existing.id, payload)
        : await this.api.createUnit(this.propertyId(), payload);
      this.saved.emit(saved);
    } catch (error) {
      const apiError = toApiError(error);
      this.serverFieldErrors.set(apiError.fieldErrors);
      this.serverError.set(apiError.message);
    } finally {
      this.submitting.set(false);
    }
  }
}
