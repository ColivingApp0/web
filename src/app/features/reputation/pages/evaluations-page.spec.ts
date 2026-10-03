import { HttpErrorResponse } from '@angular/common/http';
import { registerLocaleData } from '@angular/common';
import localeEsCo from '@angular/common/locales/es-CO';
import { LOCALE_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthSession } from '../../../core/auth/auth-session';
import { ReputationApi } from '../data-access/reputation-api';
import { EvaluationsPage } from './evaluations-page';

registerLocaleData(localeEsCo);

const received = {
  id: 'e1',
  authorUserId: 'host1',
  subjectUserId: 'me',
  relationType: 'ESTANCIA' as const,
  relationId: 'r1',
  ratings: { LIMPIEZA: 5 },
  overallRating: 4.6,
  comment: 'Muy bien',
  status: 'ACTIVA' as const,
  disputeCaseId: null,
  createdAt: '2026-11-05T10:00:00Z',
};

const written = {
  ...received,
  id: 'e2',
  authorUserId: 'me',
  subjectUserId: 'host1',
  relationId: 'r2',
  comment: null,
};

function setup() {
  const api = {
    listWritten: vi.fn().mockResolvedValue([written]),
    listReceived: vi.fn().mockResolvedValue([received]),
    disputeEvaluation: vi.fn().mockResolvedValue({
      ...received,
      status: 'DISPUTADA',
      disputeCaseId: 'case1',
    }),
  };
  TestBed.configureTestingModule({
    imports: [EvaluationsPage],
    providers: [
      provideRouter([]),
      { provide: LOCALE_ID, useValue: 'es-CO' },
      { provide: AuthSession, useValue: { user: () => ({ userId: 'me' }) } },
      { provide: ReputationApi, useValue: api },
    ],
  });
  return { api };
}

describe('EvaluationsPage', () => {
  it('should render received and written evaluations with their status', async () => {
    const { api } = setup();
    const fixture = TestBed.createComponent(EvaluationsPage);
    await fixture.whenStable();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(api.listReceived).toHaveBeenCalledWith('me');
    expect(text).toContain('Recibidas');
    expect(text).toContain('Escritas');
    expect(text).toContain('Activa');
    expect(text).toContain('host1');
    expect(text).toContain('r2');
  });

  it('should require a reason before disputing (no API call)', async () => {
    const { api } = setup();
    const fixture = TestBed.createComponent(EvaluationsPage);
    await fixture.whenStable();
    const host = fixture.nativeElement as HTMLElement;

    Array.from(host.querySelectorAll('button'))
      .find((button) => button.textContent?.trim() === 'Disputar')!
      .click();
    await fixture.whenStable();

    Array.from(host.querySelectorAll('button'))
      .find((button) => button.textContent?.includes('Enviar disputa'))!
      .click();
    await fixture.whenStable();

    expect(host.textContent).toContain('Indica el motivo de la disputa');
    expect(api.disputeEvaluation).not.toHaveBeenCalled();
  });

  it('should dispute an evaluation and show the moderation case', async () => {
    const { api } = setup();
    const fixture = TestBed.createComponent(EvaluationsPage);
    await fixture.whenStable();
    const host = fixture.nativeElement as HTMLElement;

    Array.from(host.querySelectorAll('button'))
      .find((button) => button.textContent?.trim() === 'Disputar')!
      .click();
    await fixture.whenStable();

    const reason = host.querySelector<HTMLTextAreaElement>('#dispute-reason')!;
    reason.value = '  Datos incorrectos  ';
    reason.dispatchEvent(new Event('input'));
    await fixture.whenStable();

    Array.from(host.querySelectorAll('button'))
      .find((button) => button.textContent?.includes('Enviar disputa'))!
      .click();

    await vi.waitFor(() =>
      expect(api.disputeEvaluation).toHaveBeenCalledWith('e1', 'Datos incorrectos'),
    );
    await vi.waitFor(() => expect(host.textContent).toContain('caso case1'));
    expect(api.listReceived).toHaveBeenCalledTimes(2);
  });

  it('should reflect a 409 when the evaluation was already disputed', async () => {
    const { api } = setup();
    api.disputeEvaluation.mockRejectedValue(
      new HttpErrorResponse({
        status: 409,
        error: { code: 'CONFLICT', message: 'The evaluation is already disputed' },
      }),
    );
    const fixture = TestBed.createComponent(EvaluationsPage);
    await fixture.whenStable();
    const host = fixture.nativeElement as HTMLElement;

    Array.from(host.querySelectorAll('button'))
      .find((button) => button.textContent?.trim() === 'Disputar')!
      .click();
    await fixture.whenStable();
    const reason = host.querySelector<HTMLTextAreaElement>('#dispute-reason')!;
    reason.value = 'Otra vez';
    reason.dispatchEvent(new Event('input'));
    await fixture.whenStable();

    Array.from(host.querySelectorAll('button'))
      .find((button) => button.textContent?.includes('Enviar disputa'))!
      .click();

    await vi.waitFor(() => expect(host.textContent).toContain('no aceptó la disputa'));
    expect(host.textContent).toContain('already disputed');
  });
});
