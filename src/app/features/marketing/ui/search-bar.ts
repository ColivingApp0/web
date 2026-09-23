import { Component, LOCALE_ID, computed, inject, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { FormField as SignalFormField, FormRoot, form } from '@angular/forms/signals';
import { Router } from '@angular/router';

interface SearchModel {
  city: string;
  institution: string;
  /** Presupuesto **mensual** en COP; el máximo del control significa «sin límite». */
  budget: number;
}

/**
 * Escala del control de presupuesto (afordancia de UI, no una regla de negocio):
 * cubre presupuestos **mensuales** razonables del mercado objetivo del piloto y es
 * múltiplo exacto del paso, de modo que el valor mostrado y el enviado coinciden.
 *
 * Ojo con los datos del piloto: los precios publicados se registran por noche
 * (420.000–1.200.000 COP en la semilla), así que están por encima del tope que
 * genera este control. La discrepancia está documentada (guía §15) y no se
 * compensa desde el frontend: el panel mantiene el filtro real por noche.
 */
const MONTHLY_BUDGET_MIN = 300000;
const MONTHLY_BUDGET_MAX = 5000000;
const MONTHLY_BUDGET_STEP = 100000;

/**
 * Buscador de la portada. No valida (todos los filtros son opcionales) y navega
 * a búsqueda con los parámetros en la URL; `ciudad`/`universidad` son texto libre
 * hasta que exista catálogo público (limitación conocida).
 *
 * El presupuesto se expresa **mensual** (intención del producto) y viaja como
 * `presupuesto`; la página de búsqueda lo traduce al tope por noche que el
 * contrato real entiende y muestra esa equivalencia. En el máximo del control no
 * se envía el parámetro: significa «sin límite de presupuesto».
 */
@Component({
  selector: 'app-search-bar',
  imports: [CurrencyPipe, SignalFormField, FormRoot],
  templateUrl: './search-bar.html',
})
export class SearchBar {
  private readonly router = inject(Router);
  private readonly currencyFormat = new Intl.NumberFormat(inject(LOCALE_ID), {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  });
  private readonly model = signal<SearchModel>({
    city: '',
    institution: '',
    budget: MONTHLY_BUDGET_MAX,
  });

  protected readonly budgetMin = MONTHLY_BUDGET_MIN;
  protected readonly budgetMax = MONTHLY_BUDGET_MAX;
  protected readonly budgetStep = MONTHLY_BUDGET_STEP;
  protected readonly budget = computed(() => this.model().budget);
  protected readonly budgetIsFilter = computed(() => this.budget() < MONTHLY_BUDGET_MAX);

  /** Valor anunciado por el control (mismo texto que ve el usuario). */
  protected readonly budgetValueText = computed(() => {
    if (!this.budgetIsFilter()) return 'Sin límite de presupuesto';
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
    const { city, institution } = this.model();
    if (city.trim()) queryParams['ciudad'] = city.trim();
    if (institution.trim()) queryParams['universidad'] = institution.trim();
    if (this.budgetIsFilter()) queryParams['presupuesto'] = String(this.budget());
    await this.router.navigate(['/alojamientos'], { queryParams });
  }
}
