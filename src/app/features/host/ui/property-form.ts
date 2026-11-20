import { Component, computed, inject, input, linkedSignal, output, signal } from '@angular/core';
import { FormField as SignalFormField, FormRoot, form, required } from '@angular/forms/signals';
import { toApiError } from '../../../core/http/api-error';
import { UiAlert } from '../../../shared/ui/alert';
import { UiButton } from '../../../shared/ui/button';
import { firstFieldError } from '../../../shared/ui/field-errors';
import { UiFormField } from '../../../shared/ui/form-field';
import { HostApi } from '../data-access/host-api';
import { HostProperty } from '../models/host-models';
import { HostAmenityPicker } from './amenity-picker';
import { PropertyFormModel, persistProperty, propertyFormModel } from './property-form-model';

/** Edición de la información general de la propiedad (no de sus habitaciones). */
@Component({
  selector: 'app-host-property-form',
  imports: [HostAmenityPicker, UiAlert, UiButton, UiFormField, SignalFormField, FormRoot],
  templateUrl: './property-form.html',
})
export class HostPropertyForm {
  readonly property = input<HostProperty | null>(null);
  readonly saved = output<HostProperty>();

  private readonly api = inject(HostApi);

  protected readonly submitting = signal(false);
  protected readonly serverError = signal<string | null>(null);
  protected readonly serverFieldErrors = signal<Record<string, string>>({});
  protected readonly isEdit = computed(() => this.property() !== null);

  protected readonly model = linkedSignal<PropertyFormModel>(() =>
    propertyFormModel(this.property()),
  );

  protected readonly propertyForm = form(
    this.model,
    (path) => {
      required(path.title, { message: 'El nombre de la propiedad es obligatorio.' });
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

  protected readonly titleError = computed(
    () => firstFieldError(this.propertyForm.title) ?? this.serverFieldErrors()['title'] ?? null,
  );

  private async save(): Promise<void> {
    this.submitting.set(true);
    this.serverError.set(null);
    this.serverFieldErrors.set({});
    try {
      const saved = await persistProperty(this.api, this.model(), this.property());
      this.saved.emit(saved);
    } catch (error) {
      const apiError = toApiError(error);
      this.serverFieldErrors.set(apiError.fieldErrors);
      this.serverError.set(apiError.message);
    } finally {
      this.submitting.set(false);
    }
  }

  protected setAmenities(amenities: string[]): void {
    this.model.update((model) => ({ ...model, amenities }));
  }
}
