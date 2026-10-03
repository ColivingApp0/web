import { HttpErrorResponse } from '@angular/common/http';
import { registerLocaleData } from '@angular/common';
import localeEsCo from '@angular/common/locales/es-CO';
import { LOCALE_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { AdminApi } from '../data-access/admin-api';
import { CaseDetailPage } from './case-detail-page';

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

const EVENTS = [
  {
    id: 'e1',
    type: 'ABIERTO' as const,
    actorUserId: 'u2',
    note: null,
    occurredAt: '2026-10-03T10:00:00Z',
  },
];

function setup(status: 'ABIERTO' | 'RESUELTO' = 'ABIERTO') {
  const api = {
    caseDetail: vi.fn().mockResolvedValue({ case: { ...CASE, status }, events: EVENTS }),
    assignCase: vi.fn().mockResolvedValue({ ...CASE, assigneeUserId: 'mod1' }),
    startCaseReview: vi.fn().mockResolvedValue({ ...CASE, status: 'EN_REVISION' }),
    resolveCase: vi.fn().mockResolvedValue({ ...CASE, status: 'RESUELTO' }),
    rejectCase: vi.fn().mockResolvedValue({ ...CASE, status: 'RECHAZADO' }),
  };
  TestBed.configureTestingModule({
    imports: [CaseDetailPage],
    providers: [
      { provide: LOCALE_ID, useValue: 'es-CO' },
      { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ id: 'c1' })) } },
      { provide: AdminApi, useValue: api },
    ],
  });
  return { api };
}

describe('CaseDetailPage', () => {
  it('should render the case with its traceability and the open-case actions', async () => {
    setup();
    const fixture = TestBed.createComponent(CaseDetailPage);
    await fixture.whenStable();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(text).toContain('Motivo del reporte real');
    expect(text).toContain('Trazabilidad');
    expect(text).toContain('Caso abierto');
    expect(text).toContain('Asignarme el caso');
    expect(text).toContain('Iniciar revisión');
    expect(text).toContain('Resolver el caso');
    expect(text).toContain('Rechazar el caso');
  });

  it('should not offer actions on a closed case', async () => {
    setup('RESUELTO');
    const fixture = TestBed.createComponent(CaseDetailPage);
    await fixture.whenStable();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(text).toContain('El caso está cerrado');
    expect(text).not.toContain('Resolver el caso');
  });

  it('should assign and start review through the real endpoints', async () => {
    const { api } = setup();
    const fixture = TestBed.createComponent(CaseDetailPage);
    await fixture.whenStable();
    const host = fixture.nativeElement as HTMLElement;

    Array.from(host.querySelectorAll('button'))
      .find((button) => button.textContent?.includes('Asignarme el caso'))!
      .click();
    await vi.waitFor(() => expect(api.assignCase).toHaveBeenCalledWith('c1'));
    await vi.waitFor(() => expect(host.textContent).toContain('Caso asignado a tu usuario.'));

    Array.from(host.querySelectorAll('button'))
      .find((button) => button.textContent?.includes('Iniciar revisión'))!
      .click();
    await vi.waitFor(() => expect(api.startCaseReview).toHaveBeenCalledWith('c1'));
  });

  it('should require a resolution and send it when resolving', async () => {
    const { api } = setup();
    const fixture = TestBed.createComponent(CaseDetailPage);
    await fixture.whenStable();
    const host = fixture.nativeElement as HTMLElement;

    Array.from(host.querySelectorAll('button'))
      .find((button) => button.textContent?.includes('Resolver'))!
      .click();
    await fixture.whenStable();
    expect(host.textContent).toContain('Falta completar');
    expect(api.resolveCase).not.toHaveBeenCalled();

    const area = host.querySelector<HTMLTextAreaElement>('#case-resolution')!;
    area.value = '  Contenido retirado  ';
    area.dispatchEvent(new Event('input'));
    await fixture.whenStable();

    Array.from(host.querySelectorAll('button'))
      .find((button) => button.textContent?.includes('Resolver'))!
      .click();
    await vi.waitFor(() =>
      expect(api.resolveCase).toHaveBeenCalledWith('c1', 'Contenido retirado'),
    );
  });

  it('should reflect the real conflict when the case was closed meanwhile', async () => {
    const { api } = setup();
    api.resolveCase.mockRejectedValue(
      new HttpErrorResponse({
        status: 409,
        error: { code: 'CONFLICT', message: 'The case is already closed' },
      }),
    );
    const fixture = TestBed.createComponent(CaseDetailPage);
    await fixture.whenStable();
    const host = fixture.nativeElement as HTMLElement;

    Array.from(host.querySelectorAll('button'))
      .find((button) => button.textContent?.includes('Resolver'))!
      .click();
    await fixture.whenStable();
    const area = host.querySelector<HTMLTextAreaElement>('#case-resolution')!;
    area.value = 'Resolución tardía';
    area.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    Array.from(host.querySelectorAll('button'))
      .find((button) => button.textContent?.includes('Resolver'))!
      .click();

    await vi.waitFor(() => expect(host.textContent).toContain('no es posible en el estado actual'));
    expect(host.textContent).toContain('already closed');
  });
});
