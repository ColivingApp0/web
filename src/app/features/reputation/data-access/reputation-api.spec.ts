import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ReputationApi } from './reputation-api';

const EVALUATION = {
  id: 'e1',
  authorUserId: 'guest',
  subjectUserId: 'host',
  relationType: 'ESTANCIA',
  relationId: 'r1',
  ratings: { LIMPIEZA: 5, COMUNICACION: 4, EXACTITUD: 4, RESPETO: 5, CUMPLIMIENTO: 5 },
  overallRating: 4.6,
  comment: 'Muy buena estancia',
  status: 'ACTIVA',
  disputeCaseId: null,
  createdAt: '2026-11-05T10:00:00Z',
};

const REPUTATION = {
  userId: 'host',
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

function setup() {
  TestBed.configureTestingModule({
    providers: [provideHttpClient(), provideHttpClientTesting()],
  });
  return { api: TestBed.inject(ReputationApi), http: TestBed.inject(HttpTestingController) };
}

describe('ReputationApi (contratos reales)', () => {
  it('should create an evaluation with the documented body', async () => {
    const { api, http } = setup();
    const promise = api.createEvaluation({
      relationType: 'ESTANCIA',
      relationId: 'r1',
      ratings: { LIMPIEZA: 5, COMUNICACION: 4, EXACTITUD: 4, RESPETO: 5, CUMPLIMIENTO: 5 },
      comment: 'Muy buena estancia',
    });

    const request = http.expectOne('/api/v1/reviews');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      relationType: 'ESTANCIA',
      relationId: 'r1',
      ratings: { LIMPIEZA: 5, COMUNICACION: 4, EXACTITUD: 4, RESPETO: 5, CUMPLIMIENTO: 5 },
      comment: 'Muy buena estancia',
    });
    request.flush(EVALUATION);

    await expect(promise).resolves.toMatchObject({ id: 'e1', status: 'ACTIVA' });
  });

  it('should list written and received evaluations, and dispute', async () => {
    const { api, http } = setup();

    const written = api.listWritten();
    http.expectOne('/api/v1/reviews/mine').flush([EVALUATION]);
    await expect(written).resolves.toHaveLength(1);

    const received = api.listReceived('host');
    http.expectOne('/api/v1/reviews/received/host').flush([EVALUATION]);
    await expect(received).resolves.toHaveLength(1);

    const dispute = api.disputeEvaluation('e1', 'Datos incorrectos');
    const disputeRequest = http.expectOne('/api/v1/reviews/e1/dispute');
    expect(disputeRequest.request.method).toBe('POST');
    expect(disputeRequest.request.body).toEqual({ reason: 'Datos incorrectos' });
    disputeRequest.flush({
      ...EVALUATION,
      status: 'DISPUTADA',
      disputeCaseId: 'case1',
    });
    await expect(dispute).resolves.toMatchObject({ status: 'DISPUTADA', disputeCaseId: 'case1' });
  });

  it('should read the reputation of a user with its factors', async () => {
    const { api, http } = setup();
    const promise = api.reputation('host');

    const request = http.expectOne('/api/v1/users/host/reputation');
    expect(request.request.method).toBe('GET');
    request.flush(REPUTATION);

    await expect(promise).resolves.toMatchObject({
      score: 4.25,
      formulaVersion: 1,
      benefits: ['DESTACADO'],
    });
    const reputation = await promise;
    expect(reputation.factors.map((factor) => factor.name)).toEqual([
      'rating',
      'stays',
      'verification',
      'disputes',
    ]);
  });
});
