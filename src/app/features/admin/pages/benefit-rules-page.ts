import { DecimalPipe } from '@angular/common';
import { Component, computed, inject, resource, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { toApiError } from '../../../core/http/api-error';
import { UiAlert } from '../../../shared/ui/alert';
import { UiButton } from '../../../shared/ui/button';
import { UiFormField } from '../../../shared/ui/form-field';
import { AdminApi } from '../data-access/admin-api';
import { describeAdminError } from '../data-access/admin-errors';
import {
  BenefitRuleView,
  MAX_BENEFIT_CODE_LENGTH,
  MAX_BENEFIT_DESCRIPTION_LENGTH,
  MAX_BENEFIT_SCORE,
  MIN_BENEFIT_SCORE,
  benefitCodeError,
  benefitDescriptionError,
  benefitMinScoreError,
} from '../models/admin-models';

/**
 * Administración de reglas de beneficio (RF-073 — prioridad «Posterior» en el
 * SRS, asignada a M6 por decisión del proyecto): los beneficios se configuran
 * como datos (código + puntuación mínima del score) y el cálculo sigue en el
 * backend: aquí **no** se recalcula nada.
 *
 * El contrato real solo permite crear, listar y desactivar; no hay edición ni
 * reactivación, así que la UI no las ofrece.
 */
@Component({
  selector: 'app-benefit-rules-page',
  imports: [DecimalPipe, UiAlert, UiButton, UiFormField],
  templateUrl: './benefit-rules-page.html',
})
export class BenefitRulesPage {
  private readonly api = inject(AdminApi);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly queryParams = toSignal(this.route.queryParamMap, { requireSync: true });

  protected readonly codeMaxLength = MAX_BENEFIT_CODE_LENGTH;
  protected readonly descriptionMaxLength = MAX_BENEFIT_DESCRIPTION_LENGTH;
  protected readonly minScore = MIN_BENEFIT_SCORE;
  protected readonly maxScore = MAX_BENEFIT_SCORE;

  protected readonly includeInactive = computed(
    () => this.queryParams().get('inactivas') === 'true',
  );

  protected readonly rulesResource = resource({
    params: () => this.includeInactive(),
    loader: () => this.api.listBenefitRules(!this.includeInactive()),
  });
  protected readonly rules = computed(() => this.rulesResource.value() ?? []);
  protected readonly loading = computed(() => this.rulesResource.isLoading());
  protected readonly loadError = computed(() => {
    const error = this.rulesResource.error();
    return error ? toApiError(error).message : null;
  });

  private readonly createModel = signal({ code: '', description: '', minScore: '4' });
  protected readonly createValues = computed(() => this.createModel());
  protected readonly createCodeError = computed(() => benefitCodeError(this.createModel().code));
  protected readonly createDescriptionError = computed(() =>
    benefitDescriptionError(this.createModel().description),
  );
  protected readonly createMinScoreError = computed(() =>
    benefitMinScoreError(this.createModel().minScore),
  );
  protected readonly creating = signal(false);
  protected readonly createError = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);

  protected readonly confirmingId = signal<string | null>(null);
  protected readonly deactivatingId = signal<string | null>(null);
  protected readonly actionError = signal<string | null>(null);

  protected updateCreateField(field: 'code' | 'description' | 'minScore', event: Event): void {
    const value = readValue(event);
    if (value === null) return;
    this.createModel.update((current) => ({ ...current, [field]: value }));
    this.createError.set(null);
  }

  protected toggleInactive(event: Event): void {
    const checked = event.target instanceof HTMLInputElement && event.target.checked;
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: checked ? { inactivas: 'true' } : {},
    });
  }

  protected async submitCreate(): Promise<void> {
    const values = this.createModel();
    const invalid =
      this.createCodeError() ?? this.createDescriptionError() ?? this.createMinScoreError();
    if (invalid !== null) {
      this.createError.set(invalid);
      return;
    }
    this.creating.set(true);
    this.createError.set(null);
    this.successMessage.set(null);
    const description = values.description.trim();
    try {
      await this.api.createBenefitRule({
        code: values.code.trim(),
        description: description === '' ? null : description,
        minScore: Number(values.minScore.trim().replace(',', '.')),
      });
      this.successMessage.set(
        `Regla «${values.code.trim().toUpperCase()}» creada. El backend aplicará el beneficio a partir de esa puntuación.`,
      );
      this.createModel.set({ code: '', description: '', minScore: '4' });
      this.rulesResource.reload();
    } catch (error) {
      const apiError = toApiError(error);
      this.createError.set(describeAdminError(apiError.status, apiError.code, apiError.message));
    } finally {
      this.creating.set(false);
    }
  }

  protected toggleConfirm(rule: BenefitRuleView): void {
    this.actionError.set(null);
    this.successMessage.set(null);
    this.confirmingId.update((current) => (current === rule.id ? null : rule.id));
  }

  protected async deactivate(rule: BenefitRuleView): Promise<void> {
    this.deactivatingId.set(rule.id);
    this.actionError.set(null);
    this.successMessage.set(null);
    try {
      await this.api.deactivateBenefitRule(rule.id);
      this.successMessage.set(
        'Regla desactivada: deja de conceder el beneficio y se conserva para poder referenciarla.',
      );
      this.confirmingId.set(null);
      this.rulesResource.reload();
    } catch (error) {
      const apiError = toApiError(error);
      this.actionError.set(describeAdminError(apiError.status, apiError.code, apiError.message));
    } finally {
      this.deactivatingId.set(null);
    }
  }

  protected retry(): void {
    this.rulesResource.reload();
  }
}

function readValue(event: Event): string | null {
  const target = event.target;
  if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
    return target.value;
  }
  return null;
}
