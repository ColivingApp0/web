import {
  EvaluationView,
  disputeReasonError,
  emptyRatings,
  evaluationCommentError,
  hasEvaluatedRelation,
  ratingsError,
  scoreFactorLabel,
} from './reputation-models';

function evaluation(overrides: Partial<EvaluationView> = {}): EvaluationView {
  return {
    id: 'e1',
    authorUserId: 'guest',
    subjectUserId: 'host',
    relationType: 'ESTANCIA',
    relationId: 'r1',
    ratings: { LIMPIEZA: 5 },
    overallRating: 5,
    comment: null,
    status: 'ACTIVA',
    disputeCaseId: null,
    createdAt: '2026-11-05T10:00:00Z',
    ...overrides,
  };
}

describe('hasEvaluatedRelation (una evaluación por evento)', () => {
  it('should detect a relation already evaluated by the user', () => {
    expect(hasEvaluatedRelation('r1', [evaluation()])).toBe(true);
    expect(hasEvaluatedRelation('r2', [evaluation()])).toBe(false);
    expect(hasEvaluatedRelation('r1', [])).toBe(false);
  });
});

describe('ratingsError (cinco categorías obligatorias, 1..5)', () => {
  it('should start with every category unrated', () => {
    const ratings = emptyRatings();
    expect(Object.keys(ratings)).toEqual([
      'LIMPIEZA',
      'COMUNICACION',
      'EXACTITUD',
      'RESPETO',
      'CUMPLIMIENTO',
    ]);
    expect(ratingsError(ratings)).toContain('cinco categorías');
  });

  it('should reject out-of-range values', () => {
    expect(ratingsError({ ...emptyRatings(), LIMPIEZA: 6 })).toContain('cinco categorías');
  });

  it('should accept a complete 1..5 rating', () => {
    const complete = {
      LIMPIEZA: 5,
      COMUNICACION: 4,
      EXACTITUD: 3,
      RESPETO: 5,
      CUMPLIMIENTO: 4,
    } as const;
    expect(ratingsError(complete)).toBeNull();
  });
});

describe('validaciones de texto', () => {
  it('should bound the optional comment', () => {
    expect(evaluationCommentError('')).toBeNull();
    expect(evaluationCommentError('a'.repeat(1001))).toContain('1000');
  });

  it('should require a bounded dispute reason', () => {
    expect(disputeReasonError('   ')).toContain('motivo');
    expect(disputeReasonError('Datos incorrectos')).toBeNull();
    expect(disputeReasonError('a'.repeat(1001))).toContain('1000');
  });
});

describe('scoreFactorLabel', () => {
  it('should translate the documented factors and keep unknown names', () => {
    expect(scoreFactorLabel('rating')).toBe('Valoraciones recibidas');
    expect(scoreFactorLabel('stays')).toBe('Estancias confirmadas');
    expect(scoreFactorLabel('verification')).toBe('Verificación de identidad');
    expect(scoreFactorLabel('disputes')).toBe('Disputas abiertas');
    expect(scoreFactorLabel('nuevo-factor')).toBe('nuevo-factor');
  });
});
