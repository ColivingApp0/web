import { registerLocaleData } from '@angular/common';
import localeEsCo from '@angular/common/locales/es-CO';
import { LOCALE_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { SearchBar } from './search-bar';

registerLocaleData(localeEsCo);

function setup() {
  TestBed.configureTestingModule({
    imports: [SearchBar],
    // El control respeta el idioma real de la app (es-CO).
    providers: [provideRouter([]), { provide: LOCALE_ID, useValue: 'es-CO' }],
  });
  return TestBed.inject(Router);
}

function fillAndSubmit(
  fixture: ReturnType<typeof TestBed.createComponent<SearchBar>>,
  values: { city?: string; institution?: string; budget?: string },
) {
  const host = fixture.nativeElement as HTMLElement;
  const set = (selector: string, value: string) => {
    const input = host.querySelector<HTMLInputElement>(selector);
    if (input && value) {
      input.value = value;
      input.dispatchEvent(new Event('input'));
    }
  };
  set('#search-city', values.city ?? '');
  set('#search-institution', values.institution ?? '');
  // El presupuesto es un slider: se mueve disparando `input` con el valor nuevo.
  set('#search-budget', values.budget ?? '');
  host.querySelector('form')?.dispatchEvent(new Event('submit'));
}

describe('SearchBar', () => {
  it('should navigate to listings with the provided filters as query params', async () => {
    const router = setup();
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    const fixture = TestBed.createComponent(SearchBar);
    await fixture.whenStable();

    fillAndSubmit(fixture, { city: 'Medellín', institution: 'EAFIT', budget: '900000' });
    await vi.waitFor(() => expect(navigate).toHaveBeenCalled());

    expect(navigate).toHaveBeenCalledWith(['/alojamientos'], {
      queryParams: { ciudad: 'Medellín', universidad: 'EAFIT', presupuesto: '900000' },
    });
  });

  it('should navigate with empty params when no filter is provided', async () => {
    const router = setup();
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    const fixture = TestBed.createComponent(SearchBar);
    await fixture.whenStable();

    fillAndSubmit(fixture, {});
    await vi.waitFor(() => expect(navigate).toHaveBeenCalled());

    expect(navigate).toHaveBeenCalledWith(['/alojamientos'], { queryParams: {} });
  });

  it('should expose an accessible monthly-budget slider with its visible value', async () => {
    setup();
    const fixture = TestBed.createComponent(SearchBar);
    await fixture.whenStable();
    const host = fixture.nativeElement as HTMLElement;

    const slider = host.querySelector<HTMLInputElement>('#search-budget')!;
    expect(slider.type).toBe('range');
    expect(slider.min).toBe('300000');
    expect(slider.max).toBe('5000000');
    expect(slider.step).toBe('100000');
    // Etiqueta asociada al control (nombre accesible) y valor visible/descrito.
    expect(host.querySelector('label[for="search-budget"]')?.textContent).toContain('Presupuesto');
    expect(slider.getAttribute('aria-describedby')).toBe('search-budget-value');
    expect(host.querySelector('#search-budget-value')?.textContent).toContain(
      'Sin límite de presupuesto',
    );

    slider.value = '1500000';
    slider.dispatchEvent(new Event('input'));
    await fixture.whenStable();

    expect(host.querySelector('#search-budget-value')?.textContent).toContain('Máximo mensual');
    expect(host.querySelector('#search-budget-value')?.textContent).toContain('1.500.000');
    expect(slider.getAttribute('aria-valuetext')).toContain('Máximo mensual');
    expect(host.textContent).not.toContain('por noche');
  });
});
