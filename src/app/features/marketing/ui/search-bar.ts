import { CurrencyPipe } from '@angular/common';
import { Component, LOCALE_ID, computed, inject, signal } from '@angular/core';
import { FormField as SignalFormField, FormRoot, form } from '@angular/forms/signals';
import { Router } from '@angular/router';
import { UiIcon } from '../../../shared/ui/icon';

interface SearchModel {
  q: string;
  /** Presupuesto máximo **mensual** en COP; el máximo significa «sin límite». */
  budget: number;
}

const MONTHLY_BUDGET_MIN = 300000;
const MONTHLY_BUDGET_MAX = 5000000;
const MONTHLY_BUDGET_STEP = 100000;

/**
 * Buscador de la portada: ubicación y presupuesto mensual. Ambos viajan a la
 * búsqueda real (`q` y `maxPrice`) sin conversiones ni fechas.
 */
@Component({
  selector: 'app-search-bar',
  imports: [CurrencyPipe, UiIcon, SignalFormField, FormRoot],
  templateUrl: './search-bar.html',
})
export class SearchBar {
  private readonly router = inject(Router);
  private readonly currencyFormat = new Intl.NumberFormat(inject(LOCALE_ID), {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  });
  private readonly model = signal<SearchModel>({ q: '', budget: MONTHLY_BUDGET_MAX });

  protected readonly budgetMin = MONTHLY_BUDGET_MIN;
  protected readonly budgetMax = MONTHLY_BUDGET_MAX;
  protected readonly budgetStep = MONTHLY_BUDGET_STEP;
  protected readonly budget = computed(() => this.model().budget);
  protected readonly budgetIsFilter = computed(() => this.budget() < MONTHLY_BUDGET_MAX);
  protected readonly budgetValueText = computed(() => {
    if (!this.budgetIsFilter()) return 'Sin límite de presupuesto mensual';
    return `Máximo mensual ${this.currencyFormat.format(this.budget())}`;
  });

  protected readonly searchForm = form(this.model, {
    submission: {
      action: async () => {
        await this.submit();
        return undefined;
      },
    },
  });

  protected onBudgetInput(event: Event): void {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;
    const value = Number(target.value);
    if (Number.isNaN(value)) return;
    this.model.update((current) => ({ ...current, budget: value }));
  }

  private async submit(): Promise<void> {
    const queryParams: Record<string, string> = {};
    const { q } = this.model();
    if (q.trim()) queryParams['q'] = q.trim();
    if (this.budgetIsFilter()) queryParams['maxPrice'] = String(this.budget());
    queryParams['availableOnly'] = 'true';
    await this.router.navigate(['/alojamientos'], { queryParams });
  }
}
