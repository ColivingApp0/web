import { CurrencyPipe } from '@angular/common';
import { Component, computed, inject, input, output, signal } from '@angular/core';
import { FormField as SignalFormField, FormRoot, form, pattern } from '@angular/forms/signals';
import { toApiError } from '../../../core/http/api-error';
import { UiAlert } from '../../../shared/ui/alert';
import { UiButton } from '../../../shared/ui/button';
import { firstFieldError } from '../../../shared/ui/field-errors';
import { UiFormField } from '../../../shared/ui/form-field';
import { HostApi } from '../data-access/host-api';
import { HostCurrency, HostPricing } from '../models/host-models';

interface PricingModel {
  price: string;
  currency: HostCurrency;
}

const POSITIVE_AMOUNT = /^[1-9][0-9]*(\.[0-9]{1,2})?$/;

/** Precio base por noche (concurrda con `ConfigurePricingRequest`: mayor que 0). */
@Component({
  selector: 'app-host-pricing-form',
  imports: [CurrencyPipe, UiAlert, UiButton, UiFormField, SignalFormField, FormRoot],
  templateUrl: './pricing-form.html',
})
export class HostPricingForm {
  readonly publicationId = input.required<string>();
  readonly saved = output<HostPricing>();

  private readonly api = inject(HostApi);

  protected readonly submitting = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly savedPrice = signal<HostPricing | null>(null);

  private readonly model = signal<PricingModel>({ price: '', currency: 'COP' });

  protected readonly pricingForm = form(
    this.model,
    (path) => {
      pattern(path.price, POSITIVE_AMOUNT, {
        message: 'Importe positivo, por ejemplo 850000 o 850000.50.',
      });
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

  protected readonly priceError = computed(() => firstFieldError(this.pricingForm.price));

  private async save(): Promise<void> {
    this.submitting.set(true);
    this.error.set(null);
    try {
      const model = this.model();
      const saved = await this.api.configurePricing(this.publicationId(), {
        basePricePerNight: Number(model.price),
        currency: model.currency,
      });
      this.savedPrice.set(saved);
      this.saved.emit(saved);
    } catch (error) {
      this.error.set(toApiError(error).message);
    } finally {
      this.submitting.set(false);
    }
  }
}
