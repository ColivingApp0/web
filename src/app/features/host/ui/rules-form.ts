import { Component, computed, inject, input, output, signal } from '@angular/core';
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
import { HostCancellationPolicy, HostRules } from '../models/host-models';

interface RulesModel {
  policy: HostCancellationPolicy | '';
  checkIn: string;
  checkOut: string;
  minNights: string;
  maxNights: string;
  houseRules: string;
}

const POSITIVE_INT = /^[1-9][0-9]*$/;

/** Reglas de la publicación (`ConfigureRulesRequest`): política, horarios y estancias. */
@Component({
  selector: 'app-host-rules-form',
  imports: [UiAlert, UiButton, UiFormField, SignalFormField, FormRoot],
  templateUrl: './rules-form.html',
})
export class HostRulesForm {
  readonly publicationId = input.required<string>();
  readonly saved = output<HostRules>();

  private readonly api = inject(HostApi);

  protected readonly submitting = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly formError = signal<string | null>(null);
  protected readonly savedRules = signal<HostRules | null>(null);

  private readonly model = signal<RulesModel>({
    policy: '',
    checkIn: '',
    checkOut: '',
    minNights: '1',
    maxNights: '365',
    houseRules: '',
  });

  protected readonly rulesForm = form(
    this.model,
    (path) => {
      required(path.policy, { message: 'Elige la política de cancelación.' });
      required(path.checkIn, { message: 'Indica la hora de check-in.' });
      required(path.checkOut, { message: 'Indica la hora de check-out.' });
      pattern(path.minNights, POSITIVE_INT, { message: 'Número entero mayor o igual a 1.' });
      pattern(path.maxNights, POSITIVE_INT, { message: 'Número entero mayor o igual a 1.' });
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

  protected readonly policyError = computed(() => firstFieldError(this.rulesForm.policy));
  protected readonly checkInError = computed(() => firstFieldError(this.rulesForm.checkIn));
  protected readonly checkOutError = computed(() => firstFieldError(this.rulesForm.checkOut));
  protected readonly minNightsError = computed(() => firstFieldError(this.rulesForm.minNights));
  protected readonly maxNightsError = computed(() => firstFieldError(this.rulesForm.maxNights));

  private async save(): Promise<void> {
    const model = this.model();
    // Validación de coherencia (no impuesta por el backend, pero evita datos sin sentido).
    if (Number(model.maxNights) < Number(model.minNights)) {
      this.formError.set('La estancia máxima no puede ser menor que la mínima.');
      return;
    }
    this.formError.set(null);
    this.submitting.set(true);
    this.error.set(null);
    try {
      const rules = await this.api.configureRules(this.publicationId(), {
        cancellationPolicy: model.policy as HostCancellationPolicy,
        checkInTime: model.checkIn,
        checkOutTime: model.checkOut,
        minNights: Number(model.minNights),
        maxNights: Number(model.maxNights),
        houseRules: model.houseRules
          .split(',')
          .map((rule) => rule.trim())
          .filter((rule) => rule !== ''),
      });
      this.savedRules.set(rules);
      this.saved.emit(rules);
    } catch (error) {
      this.error.set(toApiError(error).message);
    } finally {
      this.submitting.set(false);
    }
  }
}
