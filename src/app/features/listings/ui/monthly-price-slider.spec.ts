import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { MonthlyPriceSlider } from './monthly-price-slider';

describe('MonthlyPriceSlider', () => {
  it('shows monthly values and no nightly equivalence', async () => {
    await TestBed.configureTestingModule({ imports: [MonthlyPriceSlider] }).compileComponents();
    const fixture = TestBed.createComponent(MonthlyPriceSlider);
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Precio mensual');
    expect(text.toLowerCase()).not.toContain('noche');
    expect(text).toContain('Sin límite');
  });

  it('never lets the maximum cross below the minimum', async () => {
    await TestBed.configureTestingModule({ imports: [MonthlyPriceSlider] }).compileComponents();
    const fixture = TestBed.createComponent(MonthlyPriceSlider);
    fixture.componentRef.setInput('minValue', 1_000_000);
    fixture.detectChanges();

    const max = (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>(
      '#filter-max-price',
    )!;
    max.value = '400000';
    max.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(fixture.componentInstance.minValue()).toBe(1_000_000);
    expect(fixture.componentInstance.maxValue()).toBe(1_100_000);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Rango aplicado');
  });

  it('never lets the minimum cross above the maximum', async () => {
    await TestBed.configureTestingModule({ imports: [MonthlyPriceSlider] }).compileComponents();
    const fixture = TestBed.createComponent(MonthlyPriceSlider);
    fixture.componentRef.setInput('maxValue', 2_000_000);
    fixture.detectChanges();

    const min = (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>(
      '#filter-min-price',
    )!;
    min.value = '4000000';
    min.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(fixture.componentInstance.maxValue()).toBe(2_000_000);
    expect(fixture.componentInstance.minValue()).toBe(1_900_000);
  });

  it('renders the currency label', async () => {
    await TestBed.configureTestingModule({ imports: [MonthlyPriceSlider] }).compileComponents();
    const fixture = TestBed.createComponent(MonthlyPriceSlider);
    fixture.componentRef.setInput('currency', 'USD');
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('USD');
  });
});
