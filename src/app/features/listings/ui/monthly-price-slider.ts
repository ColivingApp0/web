import { Component, LOCALE_ID, computed, inject, input, model } from '@angular/core';
import {
  Currency,
  MONTHLY_PRICE_MAX,
  MONTHLY_PRICE_MIN,
  MONTHLY_PRICE_STEP,
} from '../models/listings-models';

/**
 * Rango de precio **mensual** con dos pulgares sobre una misma pista. No hay
 * conversión a noches: el backend filtra por precio mensual.
 */
@Component({
  selector: 'app-monthly-price-slider',
  template: `
    <fieldset class="m-0 min-w-0 border-0 p-0">
      <legend class="mb-2 block text-sm font-semibold text-ink">
        Precio mensual ({{ currency() }})
      </legend>

      <div class="relative h-8">
        <div
          class="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-line"
          aria-hidden="true"
        ></div>
        <div
          class="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-brand-700"
          [style.left.%]="leftPercent()"
          [style.right.%]="rightPercent()"
          aria-hidden="true"
        ></div>

        <input
          id="filter-min-price"
          class="price-range"
          type="range"
          [min]="scaleMin"
          [max]="scaleMax"
          [step]="scaleStep"
          [value]="minValue()"
          aria-label="Precio mínimo mensual"
          [attr.aria-valuetext]="minAriaText()"
          aria-describedby="price-range-hint"
          (input)="onMinInput($event)"
        />
        <input
          id="filter-max-price"
          class="price-range price-range-max"
          type="range"
          [min]="scaleMin"
          [max]="scaleMax"
          [step]="scaleStep"
          [value]="maxValue()"
          aria-label="Precio máximo mensual"
          [attr.aria-valuetext]="maxAriaText()"
          aria-describedby="price-range-hint"
          (input)="onMaxInput($event)"
        />
      </div>

      <div class="mt-2 flex items-baseline justify-between gap-3 text-xs">
        <output for="filter-min-price" class="font-bold text-ink">{{ minText() }}</output>
        <output for="filter-max-price" class="font-bold text-ink">{{ maxText() }}</output>
      </div>

      <p id="price-range-hint" class="mt-1 text-xs text-muted">
        Arrastra los extremos. «Sin límite» incluye habitaciones de cualquier precio.
      </p>
    </fieldset>
  `,
  styles: `
    .price-range {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      margin: 0;
      appearance: none;
      -webkit-appearance: none;
      background: transparent;
      pointer-events: none;
    }

    .price-range::-webkit-slider-runnable-track,
    .price-range::-moz-range-track {
      background: transparent;
      border: none;
    }

    .price-range::-webkit-slider-thumb {
      -webkit-appearance: none;
      appearance: none;
      width: 1.25rem;
      height: 1.25rem;
      border-radius: 9999px;
      border: 2px solid #fff;
      background: var(--color-brand-700);
      box-shadow: 0 1px 4px rgb(0 0 0 / 0.25);
      cursor: pointer;
      pointer-events: auto;
    }

    .price-range::-moz-range-thumb {
      width: 1.25rem;
      height: 1.25rem;
      border-radius: 9999px;
      border: 2px solid #fff;
      background: var(--color-brand-700);
      box-shadow: 0 1px 4px rgb(0 0 0 / 0.25);
      cursor: pointer;
      pointer-events: auto;
    }

    .price-range:focus-visible {
      outline: none;
    }

    .price-range:focus-visible::-webkit-slider-thumb,
    .price-range:focus-visible::-moz-range-thumb {
      box-shadow: 0 0 0 3px rgb(4 120 87 / 0.35);
    }
  `,
})
export class MonthlyPriceSlider {
  protected readonly scaleMin = MONTHLY_PRICE_MIN;
  protected readonly scaleMax = MONTHLY_PRICE_MAX;
  protected readonly scaleStep = MONTHLY_PRICE_STEP;

  readonly currency = input<Currency>('COP');
  readonly minValue = model<number>(MONTHLY_PRICE_MIN);
  readonly maxValue = model<number>(MONTHLY_PRICE_MAX);

  private readonly locale = inject(LOCALE_ID);

  protected readonly minText = computed(() => this.format(this.minValue()));
  protected readonly maxText = computed(() =>
    this.maxValue() >= MONTHLY_PRICE_MAX ? 'Sin límite' : this.format(this.maxValue()),
  );
  protected readonly minAriaText = computed(() => `Precio mínimo mensual: ${this.minText()}`);
  protected readonly maxAriaText = computed(() =>
    this.maxValue() >= MONTHLY_PRICE_MAX
      ? 'Precio máximo mensual: sin límite'
      : `Precio máximo mensual: ${this.maxText()}`,
  );
  protected readonly leftPercent = computed(() => this.percentOf(this.minValue()));
  protected readonly rightPercent = computed(() => 100 - this.percentOf(this.maxValue()));

  protected onMinInput(event: Event): void {
    const value = this.valueFrom(event);
    if (value === null) return;
    this.minValue.set(Math.min(value, this.maxValue()));
  }

  protected onMaxInput(event: Event): void {
    const value = this.valueFrom(event);
    if (value === null) return;
    this.maxValue.set(Math.max(value, this.minValue()));
  }

  private valueFrom(event: Event): number | null {
    if (!(event.target instanceof HTMLInputElement)) return null;
    const value = Number(event.target.value);
    return Number.isFinite(value) ? value : null;
  }

  private percentOf(value: number): number {
    const clamped = Math.min(MONTHLY_PRICE_MAX, Math.max(MONTHLY_PRICE_MIN, value));
    return ((clamped - MONTHLY_PRICE_MIN) / (MONTHLY_PRICE_MAX - MONTHLY_PRICE_MIN)) * 100;
  }

  private format(value: number): string {
    return new Intl.NumberFormat(this.locale, {
      style: 'currency',
      currency: this.currency(),
      maximumFractionDigits: 0,
    }).format(value);
  }
}
