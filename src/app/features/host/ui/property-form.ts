import { Component, computed, inject, input, linkedSignal, output, signal } from '@angular/core';
import { FormField as SignalFormField, FormRoot, form, required } from '@angular/forms/signals';
import { toApiError } from '../../../core/http/api-error';
import { UiAlert } from '../../../shared/ui/alert';
import { UiButton } from '../../../shared/ui/button';
import { firstFieldError } from '../../../shared/ui/field-errors';
import { UiFormField } from '../../../shared/ui/form-field';
import { HostApi } from '../data-access/host-api';
import { CreatePropertyPayload, HostProperty } from '../models/host-models';

interface PropertyFormModel {
  title: string;
  description: string;
  cityName: string;
  neighborhood: string;
  address: string;
  amenities: string;
}

/** Alta y edición de la información general de la propiedad (no de sus habitaciones). */
@Component({
  selector: 'app-host-property-form',
  imports: [UiAlert, UiButton, UiFormField, SignalFormField, FormRoot],
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

  private readonly model = linkedSignal<PropertyFormModel>(() => {
    const property = this.property();
    return {
      title: property?.title ?? '',
      description: property?.description ?? '',
      cityName: property?.cityName ?? '',
      neighborhood: property?.neighborhood ?? '',
      address: property?.address ?? '',
      amenities: (property?.amenities ?? []).join(', '),
    };
  });

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
      const model = this.model();
      const payload: CreatePropertyPayload = {
        title: model.title.trim(),
        description: model.description.trim() || null,
        cityId: this.property()?.cityId ?? null,
        cityName: model.cityName.trim() || null,
        neighborhood: model.neighborhood.trim() || null,
        address: model.address.trim() || null,
        amenities: model.amenities
          .split(',')
          .map((amenity) => amenity.trim())
          .filter((amenity) => amenity !== ''),
      };
      const existing = this.property();
      const saved = existing
        ? await this.api.updateProperty(existing.id, payload)
        : await this.api.createProperty(payload);
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
