import {
  CaseStatus,
  EMPTY_CASE_FILTERS,
  benefitCodeError,
  benefitDescriptionError,
  benefitMinScoreError,
  canReviewDocument,
  canReviewPublication,
  caseActions,
  caseFiltersFromParams,
  caseFiltersToParams,
  caseNoteError,
  catalogCodeError,
  catalogDescriptionError,
  catalogNameError,
  catalogParentCategory,
  catalogParentError,
} from './admin-models';

describe('acciones reales de un caso (RF-082)', () => {
  it('should allow every decision while the case is open', () => {
    for (const status of ['ABIERTO', 'EN_REVISION'] as CaseStatus[]) {
      expect(caseActions(status)).toEqual({
        canAssign: true,
        canStartReview: true,
        canResolve: true,
        canReject: true,
      });
    }
  });

  it('should offer nothing once the case is terminal', () => {
    for (const status of ['RESUELTO', 'RECHAZADO'] as CaseStatus[]) {
      expect(caseActions(status)).toEqual({
        canAssign: false,
        canStartReview: false,
        canResolve: false,
        canReject: false,
      });
    }
  });

  it('should require a bounded note for decisions', () => {
    expect(caseNoteError('   ')).toContain('Falta completar');
    expect(caseNoteError('Resuelto')).toBeNull();
    expect(caseNoteError('a'.repeat(1001))).toContain('1000');
  });
});

describe('filtros de la cola en la URL', () => {
  it('should start empty', () => {
    expect(caseFiltersToParams(EMPTY_CASE_FILTERS)).toEqual({});
    expect(caseFiltersFromParams(new Map<string, string>())).toEqual(EMPTY_CASE_FILTERS);
  });

  it('should round-trip the real filters', () => {
    const filters = {
      type: 'DISPUTA' as const,
      status: 'ABIERTO' as const,
      priority: 'ALTA' as const,
      assigneeUserId: 'babc1739-11e1-4328-b1b9-737468ba05fb',
      onlyOpen: true,
    };
    const params = new Map(Object.entries(caseFiltersToParams(filters)));
    expect(caseFiltersFromParams(params)).toEqual(filters);
  });

  it('should ignore values outside the contract', () => {
    const params = new Map([
      ['tipo', 'INVENTADO'],
      ['estado', 'CERRADO'],
      ['prioridad', 'URGENTE'],
      ['abiertos', 'si'],
    ]);
    expect(caseFiltersFromParams(params)).toEqual(EMPTY_CASE_FILTERS);
  });
});

describe('revisión de documentos y publicaciones', () => {
  it('should only review pending documents', () => {
    expect(canReviewDocument('PENDIENTE')).toBe(true);
    for (const status of ['APROBADO', 'RECHAZADO', 'CORRECCION_SOLICITADA'] as const) {
      expect(canReviewDocument(status)).toBe(false);
    }
  });

  it('should only review publications under review', () => {
    expect(canReviewPublication('EN_REVISION')).toBe(true);
    for (const status of ['BORRADOR', 'PUBLICADA', 'PAUSADA', 'OCULTA', 'ARCHIVADA'] as const) {
      expect(canReviewPublication(status)).toBe(false);
    }
  });
});

describe('jerarquía y validaciones de catálogo (RF-083)', () => {
  it('should declare the real hierarchy', () => {
    expect(catalogParentCategory('FACULTAD')).toBe('INSTITUCION');
    expect(catalogParentCategory('CARRERA')).toBe('FACULTAD');
    expect(catalogParentCategory('CIUDAD')).toBeNull();
    expect(catalogParentCategory('SERVICIO')).toBeNull();
  });

  it('should require the parent only for hierarchical categories', () => {
    expect(catalogParentError('FACULTAD', '')).toContain('Instituciones');
    expect(catalogParentError('CARRERA', '')).toContain('Facultades');
    expect(catalogParentError('FACULTAD', 'uuid')).toBeNull();
    expect(catalogParentError('CIUDAD', '')).toBeNull();
  });

  it('should validate code, name and description bounds', () => {
    expect(catalogCodeError('')).toContain('obligatorio');
    expect(catalogCodeError('a'.repeat(61))).toContain('60');
    expect(catalogCodeError('MEDELLIN')).toBeNull();
    expect(catalogNameError('  ')).toContain('obligatorio');
    expect(catalogNameError('a'.repeat(121))).toContain('120');
    expect(catalogDescriptionError('a'.repeat(1001))).toContain('1000');
    expect(catalogDescriptionError('')).toBeNull();
  });
});

describe('reglas de beneficio (RF-073)', () => {
  it('should validate the code and description', () => {
    expect(benefitCodeError('')).toContain('obligatorio');
    expect(benefitCodeError('a'.repeat(61))).toContain('60');
    expect(benefitDescriptionError('a'.repeat(201))).toContain('200');
  });

  it('should keep the score threshold inside 0..5', () => {
    expect(benefitMinScoreError('')).toContain('Indica la puntuación');
    expect(benefitMinScoreError('alto')).toContain('número');
    expect(benefitMinScoreError('-1')).toContain('entre 0 y 5');
    expect(benefitMinScoreError('6')).toContain('entre 0 y 5');
    expect(benefitMinScoreError('4,5')).toBeNull();
    expect(benefitMinScoreError('0')).toBeNull();
    expect(benefitMinScoreError('5')).toBeNull();
  });
});
