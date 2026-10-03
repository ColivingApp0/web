import { registerLocaleData } from '@angular/common';
import localeEsCo from '@angular/common/locales/es-CO';
import { LOCALE_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { of } from 'rxjs';
import { AdminApi } from '../data-access/admin-api';
import { BenefitRulesPage } from './benefit-rules-page';

registerLocaleData(localeEsCo);

const RULE = {
  id: 'b1',
  code: 'DESTACADO',
  description: 'Sello para el mejor score',
  minScore: 4.5,
  active: true,
  createdAt: '2026-10-03T10:00:00Z',
};

function setup(query: Record<string, string> = {}, rules = [RULE]) {
  const api = {
    listBenefitRules: vi.fn().mockResolvedValue(rules),
    createBenefitRule: vi.fn().mockResolvedValue(RULE),
    deactivateBenefitRule: vi.fn().mockResolvedValue({ ...RULE, active: false }),
  };
  const router = { navigate: vi.fn().mockResolvedValue(true) };
  TestBed.configureTestingModule({
    imports: [BenefitRulesPage],
    providers: [
      { provide: LOCALE_ID, useValue: 'es-CO' },
      { provide: Router, useValue: router },
      { provide: ActivatedRoute, useValue: { queryParamMap: of(convertToParamMap(query)) } },
      { provide: AdminApi, useValue: api },
    ],
  });
  return { api, router };
}

describe('BenefitRulesPage', () => {
  it('should list the active rules and their threshold', async () => {
    const { api } = setup();
    const fixture = TestBed.createComponent(BenefitRulesPage);
    await fixture.whenStable();
    const host = fixture.nativeElement as HTMLElement;

    expect(api.listBenefitRules).toHaveBeenCalledWith(true);
    expect(host.textContent).toContain('DESTACADO');
    expect(host.textContent).toContain('desde 4,5 de score');
    expect(host.textContent).toContain('Activa');
  });

  it('should list inactive rules only when asked', async () => {
    const { api } = setup({ inactivas: 'true' }, [{ ...RULE, active: false }]);
    const fixture = TestBed.createComponent(BenefitRulesPage);
    await fixture.whenStable();

    expect(api.listBenefitRules).toHaveBeenCalledWith(false);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Inactiva');
  });

  it('should keep the score threshold inside the real range', async () => {
    const { api } = setup();
    const fixture = TestBed.createComponent(BenefitRulesPage);
    await fixture.whenStable();
    const host = fixture.nativeElement as HTMLElement;

    const code = host.querySelector<HTMLInputElement>('#benefit-code')!;
    code.value = 'e2e_alto';
    code.dispatchEvent(new Event('input'));
    const score = host.querySelector<HTMLInputElement>('#benefit-score')!;
    score.value = '6';
    score.dispatchEvent(new Event('input'));
    await fixture.whenStable();

    Array.from(host.querySelectorAll('button'))
      .find((button) => button.textContent?.includes('Crear regla'))!
      .click();
    await fixture.whenStable();

    expect(host.textContent).toContain('entre 0 y 5');
    expect(api.createBenefitRule).not.toHaveBeenCalled();
  });

  it('should create a rule with the real body and reload the list', async () => {
    const { api } = setup();
    const fixture = TestBed.createComponent(BenefitRulesPage);
    await fixture.whenStable();
    const host = fixture.nativeElement as HTMLElement;

    const code = host.querySelector<HTMLInputElement>('#benefit-code')!;
    code.value = 'destacado';
    code.dispatchEvent(new Event('input'));
    const score = host.querySelector<HTMLInputElement>('#benefit-score')!;
    score.value = '4,5';
    score.dispatchEvent(new Event('input'));
    const description = host.querySelector<HTMLInputElement>('#benefit-description')!;
    description.value = 'Sello';
    description.dispatchEvent(new Event('input'));
    await fixture.whenStable();

    Array.from(host.querySelectorAll('button'))
      .find((button) => button.textContent?.includes('Crear regla'))!
      .click();

    await vi.waitFor(() =>
      expect(api.createBenefitRule).toHaveBeenCalledWith({
        code: 'destacado',
        description: 'Sello',
        minScore: 4.5,
      }),
    );
    await vi.waitFor(() => expect(host.textContent).toContain('DESTACADO» creada'));
    expect(api.listBenefitRules).toHaveBeenCalledTimes(2);
  });

  it('should deactivate only after confirmation', async () => {
    const { api } = setup();
    const fixture = TestBed.createComponent(BenefitRulesPage);
    await fixture.whenStable();
    const host = fixture.nativeElement as HTMLElement;

    Array.from(host.querySelectorAll('button'))
      .find((button) => button.textContent?.trim() === 'Desactivar')!
      .click();
    await fixture.whenStable();
    expect(api.deactivateBenefitRule).not.toHaveBeenCalled();

    Array.from(host.querySelectorAll('button'))
      .find((button) => button.textContent?.includes('Confirmar desactivación'))!
      .click();

    await vi.waitFor(() => expect(api.deactivateBenefitRule).toHaveBeenCalledWith('b1'));
    await vi.waitFor(() => expect(host.textContent).toContain('Regla desactivada'));
  });

  it('should explain the empty state when no rule exists', async () => {
    setup({}, []);
    const fixture = TestBed.createComponent(BenefitRulesPage);
    await fixture.whenStable();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'No hay reglas de beneficio configuradas.',
    );
  });
});
