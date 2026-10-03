import { registerLocaleData } from '@angular/common';
import localeEsCo from '@angular/common/locales/es-CO';
import { LOCALE_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { of } from 'rxjs';
import { AdminApi } from '../data-access/admin-api';
import { CasesPage } from './cases-page';

registerLocaleData(localeEsCo);

const CASE = {
  id: 'c1',
  type: 'REPORTE' as const,
  subjectType: 'CONVERSACION' as const,
  subjectId: 's1',
  reportedUserId: 'u1',
  openedByUserId: 'u2',
  description: 'Motivo del reporte real',
  priority: 'ALTA' as const,
  status: 'ABIERTO' as const,
  assigneeUserId: null,
  resolution: null,
  openedAt: '2026-10-03T10:00:00Z',
  updatedAt: '2026-10-03T10:00:00Z',
  closedAt: null,
  resolutionHours: null,
};

function setup(query: Record<string, string> = {}) {
  const api = {
    listCases: vi.fn().mockResolvedValue([CASE]),
    metrics: vi.fn().mockResolvedValue({
      totalCases: 2,
      openCases: 2,
      inReviewCases: 0,
      resolvedCases: 0,
      rejectedCases: 0,
      averageResolutionHours: null,
      openPublicationReports: 0,
    }),
  };
  const router = { navigate: vi.fn().mockResolvedValue(true) };
  TestBed.configureTestingModule({
    imports: [CasesPage],
    providers: [
      { provide: LOCALE_ID, useValue: 'es-CO' },
      { provide: Router, useValue: router },
      { provide: ActivatedRoute, useValue: { queryParamMap: of(convertToParamMap(query)) } },
      { provide: AdminApi, useValue: api },
    ],
  });
  return { api, router };
}

describe('CasesPage', () => {
  it('should list the queue without filters and show the real metrics', async () => {
    const { api } = setup();
    const fixture = TestBed.createComponent(CasesPage);
    await fixture.whenStable();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(api.listCases).toHaveBeenCalledWith({
      type: '',
      status: '',
      priority: '',
      assigneeUserId: '',
      onlyOpen: false,
    });
    expect(text).toContain('Motivo del reporte real');
    expect(text).toContain('Reporte · Conversación');
    expect(text).toContain('Prioridad Alta');
    expect(text).toContain('Sin responsable');
    expect(text).toContain('Ver trazabilidad');
    expect(text).toContain('Reportes de publicación abiertos');
  });

  it('should read the filters from the URL and send them to the API', async () => {
    setup({ tipo: 'DISPUTA', estado: 'ABIERTO', prioridad: 'ALTA', abiertos: 'true' });
    const fixture = TestBed.createComponent(CasesPage);
    await fixture.whenStable();

    const api = TestBed.inject(AdminApi) as unknown as { listCases: ReturnType<typeof vi.fn> };
    expect(api.listCases).toHaveBeenCalledWith({
      type: 'DISPUTA',
      status: 'ABIERTO',
      priority: 'ALTA',
      assigneeUserId: '',
      onlyOpen: true,
    });
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Quitar filtros');
  });

  it('should apply the draft filters to the URL', async () => {
    const { router } = setup();
    const fixture = TestBed.createComponent(CasesPage);
    await fixture.whenStable();
    const host = fixture.nativeElement as HTMLElement;

    const type = host.querySelector<HTMLSelectElement>('#case-type')!;
    type.value = 'DISPUTA';
    type.dispatchEvent(new Event('change'));
    const onlyOpen = host.querySelector<HTMLInputElement>('input[type="checkbox"]')!;
    onlyOpen.checked = true;
    onlyOpen.dispatchEvent(new Event('change'));
    await fixture.whenStable();

    Array.from(host.querySelectorAll('button'))
      .find((button) => button.textContent?.includes('Aplicar filtros'))!
      .click();

    expect(router.navigate).toHaveBeenCalledWith(
      [],
      expect.objectContaining({ queryParams: { tipo: 'DISPUTA', abiertos: 'true' } }),
    );
  });

  it('should show the empty state when there is nothing to moderate', async () => {
    const { api } = setup();
    api.listCases.mockResolvedValue([]);
    const fixture = TestBed.createComponent(CasesPage);
    await fixture.whenStable();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'No hay casos con estos filtros.',
    );
  });
});
