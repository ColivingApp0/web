import { Component, computed, inject, input, linkedSignal, output, signal } from '@angular/core';
import {
  FormField as SignalFormField,
  FormRoot,
  form,
  pattern,
  required,
} from '@angular/forms/signals';
import { toApiError } from '../../../core/http/api-error';
import { UiAlert } from '../../../shared/ui/alert';
import { UiButton } from '../../../shared/ui/button';
import { firstFieldError } from '../../../shared/ui/field-errors';
import { UiFormField } from '../../../shared/ui/form-field';
import { HostApi } from '../data-access/host-api';
import { CreateUnitPayload, HostUnit } from '../models/host-models';

interface UnitFormModel {
  name: string;
  maxGuests: string;
  bedrooms: string;
  beds: string;
  bathrooms: string;
}

const POSITIVE_INT = /^[1-9][0-9]*$/;
const NON_NEGATIVE_INT = /^[0-9]+$/;

/**
 * Alta y edición de unidades. En edición envía los campos que expone el
 * formulario; `typeCode`/`accessibilityCodes` se omiten (`null` conserva los
 * catálogos actuales — contrato real de `Unit.update`).
 */
@Component({
  selector: 'app-host-unit-form',
  imports: [UiAlert, UiButton, UiFormField, SignalFormField, FormRoot],
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
      maxGuests: unit ? String(unit.maxGuests) : '1',
      bedrooms: unit ? String(unit.bedrooms) : '0',
      beds: unit ? String(unit.beds) : '1',
      bathrooms: unit ? String(unit.bathrooms) : '1',
    };
  });

  protected readonly unitForm = form(
    this.model,
    (path) => {
      required(path.name, { message: 'El nombre es obligatorio.' });
      pattern(path.maxGuests, POSITIVE_INT, { message: 'Número entero mayor o igual a 1.' });
      pattern(path.bedrooms, NON_NEGATIVE_INT, { message: 'Número entero (0 o más).' });
      pattern(path.beds, NON_NEGATIVE_INT, { message: 'Número entero (0 o más).' });
      pattern(path.bathrooms, NON_NEGATIVE_INT, { message: 'Número entero (0 o más).' });
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
  protected readonly maxGuestsError = computed(() => firstFieldError(this.unitForm.maxGuests));
  protected readonly bedroomsError = computed(() => firstFieldError(this.unitForm.bedrooms));
  protected readonly bedsError = computed(() => firstFieldError(this.unitForm.beds));
  protected readonly bathroomsError = computed(() => firstFieldError(this.unitForm.bathrooms));

  private async save(): Promise<void> {
    this.submitting.set(true);
    this.serverError.set(null);
    this.serverFieldErrors.set({});
    try {
      const model = this.model();
      const payload: CreateUnitPayload = {
        name: model.name.trim(),
        maxGuests: Number(model.maxGuests),
        bedrooms: Number(model.bedrooms),
        beds: Number(model.beds),
        bathrooms: Number(model.bathrooms),
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
