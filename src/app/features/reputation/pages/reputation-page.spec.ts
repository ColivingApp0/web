import { registerLocaleData } from '@angular/common';
import localeEsCo from '@angular/common/locales/es-CO';
import { LOCALE_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AuthSession } from '../../../core/auth/auth-session';
import { ReputationApi } from '../data-access/reputation-api';
import { ReputationPage } from './reputation-page';

registerLocaleData(localeEsCo);

const reputation = {
  userId: 'me',
  score: 4.25,
  formulaVersion: 1,
  factors: [
    { name: 'rating', weight: 0.5, normalizedValue: 0.92, contribution: 0.46 },
    { name: 'stays', weight: 0.3, normalizedValue: 1, contribution: 0.3 },
    { name: 'verification', weight: 0.1, normalizedValue: 1, contribution: 0.1 },
    { name: 'disputes', weight: 0.1, normalizedValue: 1, contribution: 0.1 },
  ],
  benefits: ['DESTACADO'],
  activeEvaluations: 3,
  disputedEvaluations: 0,
  confirmedStays: 4,
  computedAt: '2026-11-05T11:00:00Z',
};

const received = [
  {
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
  },
];

function setup(routeParams: Record<string, string> = {}) {
  const api = {
    reputation: vi.fn().mockResolvedValue(reputation),
    listReceived: vi.fn().mockResolvedValue(received),
  };
  TestBed.configureTestingModule({
    imports: [ReputationPage],
    providers: [
      provideRouter([]),
      { provide: LOCALE_ID, useValue: 'es-CO' },
      { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap(routeParams)) } },
      { provide: AuthSession, useValue: { user: () => ({ userId: 'me' }) } },
      { provide: ReputationApi, useValue: api },
    ],
  });
  return { api };
}

describe('ReputationPage', () => {
  it('should show my score, the documented factors, the version and the benefits', async () => {
    const { api } = setup();
    const fixture = TestBed.createComponent(ReputationPage);
    await fixture.whenStable();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(api.reputation).toHaveBeenCalledWith('me');
    expect(text).toContain('Mi reputación');
    expect(text).toContain('4,25');
    expect(text).toContain('Valoraciones recibidas');
    expect(text).toContain('Estancias confirmadas');
    expect(text).toContain('Verificación de identidad');
    expect(text).toContain('Disputas abiertas');
    expect(text).toContain('DESTACADO');
    expect(text).toContain('solo lectura');
    expect(text).toContain('Mis evaluaciones');
  });

  it('should recalculate only when the user asks for it', async () => {
    const { api } = setup();
    const fixture = TestBed.createComponent(ReputationPage);
    await fixture.whenStable();
    const host = fixture.nativeElement as HTMLElement;

    expect(api.reputation).toHaveBeenCalledTimes(1);
    Array.from(host.querySelectorAll('button'))
      .find((button) => button.textContent?.includes('Recalcular'))!
      .click();

    await vi.waitFor(() => expect(api.reputation).toHaveBeenCalledTimes(2));
  });

  it('should render another user read-only without self links', async () => {
    const { api } = setup({ id: 'guest1' });
    const fixture = TestBed.createComponent(ReputationPage);
    await fixture.whenStable();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(api.reputation).toHaveBeenCalledWith('guest1');
    expect(text).toContain('Reputación del usuario');
    expect(text).toContain('guest1');
    expect(text).not.toContain('Mis evaluaciones');
  });
});
