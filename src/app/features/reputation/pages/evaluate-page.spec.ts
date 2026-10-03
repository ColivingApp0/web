import { HttpErrorResponse } from '@angular/common/http';
import { registerLocaleData } from '@angular/common';
import localeEsCo from '@angular/common/locales/es-CO';
import { LOCALE_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { of } from 'rxjs';
import { ReputationApi } from '../data-access/reputation-api';
import { EvaluatePage } from './evaluate-page';

registerLocaleData(localeEsCo);

const evaluation = {
  id: 'e1',
  authorUserId: 'guest',
  subjectUserId: 'host',
  relationType: 'ESTANCIA' as const,
  relationId: 'r1',
  ratings: { LIMPIEZA: 5 },
  overallRating: 5,
  comment: null,
  status: 'ACTIVA' as const,
  disputeCaseId: null,
  createdAt: '2026-11-05T10:00:00Z',
};

function setup(query: Record<string, string>, written = [] as (typeof evaluation)[]) {
  const api = {
    listWritten: vi.fn().mockResolvedValue(written),
    createEvaluation: vi.fn().mockResolvedValue(evaluation),
  };
  const router = { navigate: vi.fn().mockResolvedValue(true) };
  TestBed.configureTestingModule({
    imports: [EvaluatePage],
    providers: [
      { provide: LOCALE_ID, useValue: 'es-CO' },
      { provide: Router, useValue: router },
      { provide: ActivatedRoute, useValue: { queryParamMap: of(convertToParamMap(query)) } },
      { provide: ReputationApi, useValue: api },
    ],
  });
  return { api, router };
}

const query = { relacion: 'r1', desde: '2026-11-01', hasta: '2026-11-04' };

describe('EvaluatePage', () => {
  it('should show the five mandatory categories', async () => {
    setup(query);
    const fixture = TestBed.createComponent(EvaluatePage);
    await fixture.whenStable();
    const host = fixture.nativeElement as HTMLElement;

    expect(host.querySelectorAll('app-rating-input').length).toBe(5);
    expect(host.textContent).toContain('Limpieza');
    expect(host.textContent).toContain('Comunicación');
    expect(host.textContent).toContain('Exactitud de la información');
    expect(host.textContent).toContain('Respeto');
    expect(host.textContent).toContain('Cumplimiento de lo acordado');
    expect(host.textContent).toContain('r1');
  });

  it('should block an incomplete evaluation without calling the API', async () => {
    const { api } = setup(query);
    const fixture = TestBed.createComponent(EvaluatePage);
    await fixture.whenStable();
    const host = fixture.nativeElement as HTMLElement;

    Array.from(host.querySelectorAll('button'))
      .find((button) => button.textContent?.includes('Enviar evaluación'))!
      .click();
    await fixture.whenStable();

    expect(host.textContent).toContain('Puntúa las cinco categorías');
    expect(api.createEvaluation).not.toHaveBeenCalled();
  });

  it('should send the ratings and navigate to my evaluations', async () => {
    const { api, router } = setup(query);
    const fixture = TestBed.createComponent(EvaluatePage);
    await fixture.whenStable();
    const host = fixture.nativeElement as HTMLElement;

    for (const group of Array.from(host.querySelectorAll('app-rating-input'))) {
      const last = group.querySelectorAll<HTMLInputElement>('input[type="radio"]')[4];
      last.checked = true;
      last.dispatchEvent(new Event('change'));
    }
    await fixture.whenStable();

    Array.from(host.querySelectorAll('button'))
      .find((button) => button.textContent?.includes('Enviar evaluación'))!
      .click();

    await vi.waitFor(() =>
      expect(api.createEvaluation).toHaveBeenCalledWith({
        relationType: 'ESTANCIA',
        relationId: 'r1',
        ratings: {
          LIMPIEZA: 5,
          COMUNICACION: 5,
          EXACTITUD: 5,
          RESPETO: 5,
          CUMPLIMIENTO: 5,
        },
        comment: null,
      }),
    );
    await vi.waitFor(() =>
      expect(router.navigate).toHaveBeenCalledWith(['/reputacion/evaluaciones']),
    );
  });

  it('should detect a relation already evaluated (one evaluation per event)', async () => {
    setup(query, [evaluation]);
    const fixture = TestBed.createComponent(EvaluatePage);
    await fixture.whenStable();
    const host = fixture.nativeElement as HTMLElement;

    await vi.waitFor(() => expect(host.textContent).toContain('Ya evaluaste esta estancia'));
    expect(host.querySelectorAll('app-rating-input').length).toBe(0);
  });

  it('should explain the real 409 from the server', async () => {
    const { api } = setup(query);
    api.createEvaluation.mockRejectedValue(
      new HttpErrorResponse({
        status: 409,
        error: { code: 'CONFLICT', message: 'This relation was already evaluated' },
      }),
    );
    const fixture = TestBed.createComponent(EvaluatePage);
    await fixture.whenStable();
    const host = fixture.nativeElement as HTMLElement;

    for (const group of Array.from(host.querySelectorAll('app-rating-input'))) {
      const last = group.querySelectorAll<HTMLInputElement>('input[type="radio"]')[4];
      last.checked = true;
      last.dispatchEvent(new Event('change'));
    }
    await fixture.whenStable();
    Array.from(host.querySelectorAll('button'))
      .find((button) => button.textContent?.includes('Enviar evaluación'))!
      .click();

    await vi.waitFor(() => expect(host.textContent).toContain('no aceptó la evaluación'));
    expect(host.textContent).toContain('already evaluated');
  });
});
