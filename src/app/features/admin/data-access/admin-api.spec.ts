import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AdminApi } from './admin-api';

const CASE = {
  id: 'c1',
  type: 'REPORTE',
  subjectType: 'CONVERSACION',
  subjectId: 's1',
  reportedUserId: 'u1',
  openedByUserId: 'u2',
  description: 'Motivo del reporte',
  priority: 'ALTA',
  status: 'ABIERTO',
  assigneeUserId: null,
  resolution: null,
  openedAt: '2026-10-03T10:00:00Z',
  updatedAt: '2026-10-03T10:00:00Z',
  closedAt: null,
  resolutionHours: null,
};

function setup() {
  TestBed.configureTestingModule({
    providers: [provideHttpClient(), provideHttpClientTesting()],
  });
  return { api: TestBed.inject(AdminApi), http: TestBed.inject(HttpTestingController) };
}

describe('AdminApi — moderación (RF-082)', () => {
  it('should send the real filters of the queue', async () => {
    const { api, http } = setup();
    const promise = api.listCases({
      type: 'DISPUTA',
      status: 'ABIERTO',
      priority: 'ALTA',
      assigneeUserId: 'mod1',
      onlyOpen: true,
    });

    const request = http.expectOne((candidate) => candidate.url === '/api/v1/admin/cases');
    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('type')).toBe('DISPUTA');
    expect(request.request.params.get('status')).toBe('ABIERTO');
    expect(request.request.params.get('priority')).toBe('ALTA');
    expect(request.request.params.get('assigneeUserId')).toBe('mod1');
    expect(request.request.params.get('onlyOpen')).toBe('true');
    request.flush([CASE]);

    await expect(promise).resolves.toHaveLength(1);
  });

  it('should not send empty filters', async () => {
    const { api, http } = setup();
    const promise = api.listCases({
      type: '',
      status: '',
      priority: '',
      assigneeUserId: '  ',
      onlyOpen: false,
    });

    const request = http.expectOne('/api/v1/admin/cases');
    expect(request.request.params.keys()).toEqual([]);
    request.flush([]);
    await expect(promise).resolves.toEqual([]);
  });

  it('should read the detail with its traceability and the metrics', async () => {
    const { api, http } = setup();

    const detail = api.caseDetail('c1');
    http.expectOne('/api/v1/admin/cases/c1').flush({
      case: CASE,
      events: [
        {
          id: 'e1',
          type: 'ABIERTO',
          actorUserId: 'u2',
          note: null,
          occurredAt: '2026-10-03T10:00:00Z',
        },
      ],
    });
    await expect(detail).resolves.toMatchObject({ case: { id: 'c1' } });

    const metrics = api.metrics();
    http.expectOne('/api/v1/admin/cases/metrics').flush({
      totalCases: 2,
      openCases: 2,
      inReviewCases: 0,
      resolvedCases: 0,
      rejectedCases: 0,
      averageResolutionHours: null,
      openPublicationReports: 0,
    });
    await expect(metrics).resolves.toMatchObject({ totalCases: 2, openCases: 2 });
  });

  it('should assign, start review, resolve and reject with the real bodies', async () => {
    const { api, http } = setup();

    const assign = api.assignCase('c1');
    const assignRequest = http.expectOne('/api/v1/admin/cases/c1/assign');
    expect(assignRequest.request.method).toBe('POST');
    assignRequest.flush({ ...CASE, assigneeUserId: 'mod1' });
    await expect(assign).resolves.toMatchObject({ assigneeUserId: 'mod1' });

    const review = api.startCaseReview('c1');
    http.expectOne('/api/v1/admin/cases/c1/review').flush({ ...CASE, status: 'EN_REVISION' });
    await expect(review).resolves.toMatchObject({ status: 'EN_REVISION' });

    const resolve = api.resolveCase('c1', 'Contenido retirado');
    const resolveRequest = http.expectOne('/api/v1/admin/cases/c1/resolve');
    expect(resolveRequest.request.body).toEqual({ resolution: 'Contenido retirado' });
    resolveRequest.flush({ ...CASE, status: 'RESUELTO', resolution: 'Contenido retirado' });
    await expect(resolve).resolves.toMatchObject({ status: 'RESUELTO' });

    const reject = api.rejectCase('c1', 'Sin infracción');
    const rejectRequest = http.expectOne('/api/v1/admin/cases/c1/reject');
    expect(rejectRequest.request.body).toEqual({ reason: 'Sin infracción' });
    rejectRequest.flush({ ...CASE, status: 'RECHAZADO' });
    await expect(reject).resolves.toMatchObject({ status: 'RECHAZADO' });
  });
});

describe('AdminApi — documentos (RF-080)', () => {
  it('should list by status and review with the real endpoints', async () => {
    const { api, http } = setup();

    const list = api.listDocuments('PENDIENTE');
    const listRequest = http.expectOne('/api/v1/admin/verification-documents?status=PENDIENTE');
    expect(listRequest.request.params.get('status')).toBe('PENDIENTE');
    listRequest.flush([
      {
        id: 'd1',
        type: 'IDENTIDAD',
        status: 'PENDIENTE',
        uploadedAt: '2026-10-03T10:00:00Z',
        reviewedAt: null,
        reviewReason: null,
      },
    ]);
    await expect(list).resolves.toHaveLength(1);

    const all = api.listDocuments(null);
    const allRequest = http.expectOne('/api/v1/admin/verification-documents');
    expect(allRequest.request.params.keys()).toEqual([]);
    allRequest.flush([]);
    await expect(all).resolves.toEqual([]);

    const approve = api.approveDocument('d1');
    const approveRequest = http.expectOne('/api/v1/admin/verification-documents/d1/approve');
    expect(approveRequest.request.method).toBe('POST');
    approveRequest.flush(null, { status: 204, statusText: 'No Content' });
    await expect(approve).resolves.toBeNull();

    const reject = api.rejectDocument('d1', 'Ilegible');
    const rejectRequest = http.expectOne('/api/v1/admin/verification-documents/d1/reject');
    expect(rejectRequest.request.body).toEqual({ reason: 'Ilegible' });
    rejectRequest.flush(null, { status: 204, statusText: 'No Content' });
    await expect(reject).resolves.toBeNull();

    const correction = api.requestDocumentCorrection('d1', 'Falta el reverso');
    const correctionRequest = http.expectOne(
      '/api/v1/admin/verification-documents/d1/request-correction',
    );
    expect(correctionRequest.request.body).toEqual({ reason: 'Falta el reverso' });
    correctionRequest.flush(null, { status: 204, statusText: 'No Content' });
    await expect(correction).resolves.toBeNull();
  });
});

describe('AdminApi — publicaciones (RF-081)', () => {
  it('should read the queue by status and send the review decision', async () => {
    const { api, http } = setup();
    const publication = {
      id: 'p1',
      unitId: 'u1',
      title: 'Estudio 502 en Torre M3',
      status: 'EN_REVISION',
      services: [],
      applicableRuleCodes: [],
    };

    const queue = api.publicationsQueue('EN_REVISION');
    const queueRequest = http.expectOne('/api/v1/admin/publications?status=EN_REVISION');
    expect(queueRequest.request.params.get('status')).toBe('EN_REVISION');
    queueRequest.flush([publication]);
    await expect(queue).resolves.toHaveLength(1);

    const defaults = api.publicationsQueue(null);
    const defaultRequest = http.expectOne('/api/v1/admin/publications');
    expect(defaultRequest.request.params.keys()).toEqual([]);
    defaultRequest.flush([publication]);
    await expect(defaults).resolves.toHaveLength(1);

    const rejected = api.reviewPublication('p1', 'RECHAZADA', 'Fotos engañosas');
    const reviewRequest = http.expectOne('/api/v1/admin/publications/p1/review');
    expect(reviewRequest.request.body).toEqual({
      decision: 'RECHAZADA',
      note: 'Fotos engañosas',
    });
    reviewRequest.flush({ ...publication, status: 'BORRADOR' });
    await expect(rejected).resolves.toMatchObject({ status: 'BORRADOR' });

    const approved = api.reviewPublication('p1', 'APROBADA', null);
    const approveRequest = http.expectOne('/api/v1/admin/publications/p1/review');
    expect(approveRequest.request.body).toEqual({ decision: 'APROBADA', note: null });
    approveRequest.flush({ ...publication, status: 'PUBLICADA' });
    await expect(approved).resolves.toMatchObject({ status: 'PUBLICADA' });
  });
});

describe('AdminApi — catálogos (RF-083)', () => {
  const entry = {
    id: 'k1',
    category: 'CIUDAD',
    code: 'MEDELLIN',
    name: 'Medellín',
    description: null,
    parentId: null,
    active: true,
    createdAt: '2026-10-03T10:00:00Z',
    updatedAt: '2026-10-03T10:00:00Z',
  };

  it('should list with the real activeOnly parameter', async () => {
    const { api, http } = setup();

    const active = api.listCatalog('CIUDAD', true);
    const activeRequest = http.expectOne('/api/v1/admin/catalogs/CIUDAD?activeOnly=true');
    expect(activeRequest.request.params.get('activeOnly')).toBe('true');
    activeRequest.flush([entry]);
    await expect(active).resolves.toHaveLength(1);

    const all = api.listCatalog('CIUDAD', false);
    const allRequest = http.expectOne('/api/v1/admin/catalogs/CIUDAD?activeOnly=false');
    expect(allRequest.request.params.get('activeOnly')).toBe('false');
    allRequest.flush([{ ...entry, active: false }]);
    await expect(all).resolves.toHaveLength(1);
  });

  it('should create with parent, update the editable fields and deactivate', async () => {
    const { api, http } = setup();

    const create = api.createCatalogEntry('FACULTAD', {
      code: 'ingenieria',
      name: 'Ingeniería',
      description: null,
      parentId: 'inst1',
    });
    const createRequest = http.expectOne('/api/v1/admin/catalogs/FACULTAD');
    expect(createRequest.request.method).toBe('POST');
    expect(createRequest.request.body).toEqual({
      code: 'ingenieria',
      name: 'Ingeniería',
      description: null,
      parentId: 'inst1',
    });
    createRequest.flush({ ...entry, category: 'FACULTAD', parentId: 'inst1' });
    await expect(create).resolves.toMatchObject({ parentId: 'inst1' });

    const update = api.updateCatalogEntry('CIUDAD', 'k1', {
      name: 'Medellín (Antioquia)',
      description: 'Capital',
    });
    const updateRequest = http.expectOne('/api/v1/admin/catalogs/CIUDAD/k1');
    expect(updateRequest.request.method).toBe('PUT');
    expect(updateRequest.request.body).toEqual({
      name: 'Medellín (Antioquia)',
      description: 'Capital',
    });
    updateRequest.flush({ ...entry, name: 'Medellín (Antioquia)' });
    await expect(update).resolves.toMatchObject({ name: 'Medellín (Antioquia)' });

    const deactivate = api.deactivateCatalogEntry('CIUDAD', 'k1');
    const deactivateRequest = http.expectOne('/api/v1/admin/catalogs/CIUDAD/k1');
    expect(deactivateRequest.request.method).toBe('DELETE');
    deactivateRequest.flush({ ...entry, active: false });
    await expect(deactivate).resolves.toMatchObject({ active: false });
  });
});

describe('AdminApi — reglas de beneficio y roles', () => {
  it('should list, create and deactivate benefit rules', async () => {
    const { api, http } = setup();
    const rule = {
      id: 'b1',
      code: 'DESTACADO',
      description: 'Sello para el mejor score',
      minScore: 4.5,
      active: true,
      createdAt: '2026-10-03T10:00:00Z',
    };

    const list = api.listBenefitRules(true);
    const listRequest = http.expectOne('/api/v1/admin/benefit-rules?activeOnly=true');
    expect(listRequest.request.params.get('activeOnly')).toBe('true');
    listRequest.flush([rule]);
    await expect(list).resolves.toHaveLength(1);

    const create = api.createBenefitRule({
      code: 'DESTACADO',
      description: 'Sello para el mejor score',
      minScore: 4.5,
    });
    const createRequest = http.expectOne('/api/v1/admin/benefit-rules');
    expect(createRequest.request.body).toEqual({
      code: 'DESTACADO',
      description: 'Sello para el mejor score',
      minScore: 4.5,
    });
    createRequest.flush(rule);
    await expect(create).resolves.toMatchObject({ code: 'DESTACADO' });

    const deactivate = api.deactivateBenefitRule('b1');
    const deactivateRequest = http.expectOne('/api/v1/admin/benefit-rules/b1/deactivate');
    expect(deactivateRequest.request.method).toBe('POST');
    deactivateRequest.flush({ ...rule, active: false });
    await expect(deactivate).resolves.toMatchObject({ active: false });
  });

  it('should expose the role catalog of the admin namespace', async () => {
    const { api, http } = setup();
    const promise = api.listRoles();
    http
      .expectOne('/api/v1/admin/roles')
      .flush([{ id: 'r1', code: 'MODERADOR', name: 'Moderador' }]);
    await expect(promise).resolves.toHaveLength(1);
  });
});
