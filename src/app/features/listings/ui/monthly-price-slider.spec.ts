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

  it('renders the currency label', async () => {
    await TestBed.configureTestingModule({ imports: [MonthlyPriceSlider] }).compileComponents();
    const fixture = TestBed.createComponent(MonthlyPriceSlider);
    fixture.componentRef.setInput('currency', 'USD');
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('USD');
  });
});
