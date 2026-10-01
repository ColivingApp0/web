/**
 * Contratos del contexto `reputation` (RF-070, RF-071, RF-072; RF-073 solo
 * lectura de beneficios) tal como los exponen `api/.../reputation`.
 *
 * Hechos verificados que condicionan la UI:
 * - `relationId` es el **id de la reserva**; el sujeto evaluado **siempre es la
 *   contraparte** (el cliente no lo elige) y la relación debe estar `CONFIRMADA`.
 * - Las **cinco categorías son obligatorias** (1..5) y solo hay **una evaluación
 *   por autor y evento**.
 * - Una evaluación `DISPUTADA` **deja de contar** para el score.
 * - `GET /users/{id}/reputation` calcula y **guarda un snapshot en cada lectura**
 *   (write-on-GET): la UI la consulta una vez por visita o tras una acción
 *   explícita, nunca en bucle.
 * - No hay paginación ni tiempo real.
 */

/** Categorías definidas por la SRS (RF-070): todas obligatorias, 1..5. */
export type EvaluationCategory =
  'LIMPIEZA' | 'COMUNICACION' | 'EXACTITUD' | 'RESPETO' | 'CUMPLIMIENTO';

/** Orden estable de las categorías (el del enum del backend). */
export const EVALUATION_CATEGORIES: readonly EvaluationCategory[] = [
  'LIMPIEZA',
  'COMUNICACION',
  'EXACTITUD',
  'RESPETO',
  'CUMPLIMIENTO',
];

export const EVALUATION_CATEGORY_LABELS: Record<EvaluationCategory, string> = {
  LIMPIEZA: 'Limpieza',
  COMUNICACION: 'Comunicación',
  EXACTITUD: 'Exactitud de la información',
  RESPETO: 'Respeto',
  CUMPLIMIENTO: 'Cumplimiento de lo acordado',
};

export type EvaluationStatus = 'ACTIVA' | 'DISPUTADA';

/**
 * Tipo de relación evaluable. El contrato define `INTERACCION`, pero hoy **solo
 * se resuelven reservas** (`ReservationEvaluationQuery.relationOf`), así que la
 * UI ofrece únicamente `ESTANCIA`.
 */
export type RelationType = 'ESTANCIA' | 'INTERACCION';

/** Respuesta de las evaluaciones (`EvaluationView`). */
export interface EvaluationView {
  id: string;
  authorUserId: string;
  subjectUserId: string;
  relationType: RelationType;
  /** Id de la reserva que hace elegible la evaluación. */
  relationId: string;
  /** Notas por categoría (siempre las cinco). */
  ratings: Partial<Record<EvaluationCategory, number>>;
  overallRating: number;
  comment: string | null;
  status: EvaluationStatus;
  disputeCaseId: string | null;
  createdAt: string;
}

/** Factor documentado del score (`ScoreFactor`, RF-071). */
export interface ScoreFactor {
  name: string;
  weight: number;
  normalizedValue: number;
  contribution: number;
}

/** Reputación consultable (`ReputationView`, RF-071 + beneficios de RF-073). */
export interface ReputationView {
  userId: string;
  score: number;
  formulaVersion: number;
  factors: ScoreFactor[];
  /** Códigos de beneficio que el score concede (solo lectura en M5). */
  benefits: string[];
  activeEvaluations: number;
  disputedEvaluations: number;
  confirmedStays: number;
  computedAt: string;
}

/** Cuerpo de `POST /api/v1/reviews`. */
export interface CreateEvaluationPayload {
  relationType: RelationType;
  relationId: string;
  ratings: Record<EvaluationCategory, number>;
  comment: string | null;
}

/** Límites reales del contrato (`Evaluation`). */
export const MIN_RATING = 1;
export const MAX_RATING = 5;
export const EVALUATION_COMMENT_MAX_LENGTH = 1000;

export const EVALUATION_STATUS_LABELS: Record<EvaluationStatus, string> = {
  ACTIVA: 'Activa',
  DISPUTADA: 'Disputada (no cuenta para el score)',
};

export const EVALUATION_STATUS_CLASSES: Record<EvaluationStatus, string> = {
  ACTIVA: 'bg-brand-700/10 text-brand-800',
  DISPUTADA: 'bg-accent-500/15 text-accent-600',
};

/** Etiquetas de los factores reales de la fórmula. */
export const SCORE_FACTOR_LABELS: Record<string, string> = {
  rating: 'Valoraciones recibidas',
  stays: 'Estancias confirmadas',
  verification: 'Verificación de identidad',
  disputes: 'Disputas abiertas',
};

export function scoreFactorLabel(name: string): string {
  return SCORE_FACTOR_LABELS[name] ?? name;
}

/** ¿Ya evalué esta relación? (una evaluación por autor y evento). */
export function hasEvaluatedRelation(
  relationId: string,
  writtenEvaluations: readonly EvaluationView[],
): boolean {
  return writtenEvaluations.some((evaluation) => evaluation.relationId === relationId);
}

/** Notas iniciales del formulario (0 = sin puntuar todavía). */
export function emptyRatings(): Record<EvaluationCategory, number> {
  return EVALUATION_CATEGORIES.reduce(
    (ratings, category) => ({ ...ratings, [category]: 0 }),
    {} as Record<EvaluationCategory, number>,
  );
}

/** Todas las categorías deben puntuarse 1..5 (el backend responde 400 si falta). */
export function ratingsError(ratings: Record<EvaluationCategory, number>): string | null {
  const missing = EVALUATION_CATEGORIES.filter((category) => {
    const value = ratings[category];
    return value < MIN_RATING || value > MAX_RATING;
  });
  return missing.length === 0
    ? null
    : 'Puntúa las cinco categorías (de 1 a 5) antes de enviar la evaluación.';
}

/** El comentario es opcional pero tiene límite real. */
export function evaluationCommentError(comment: string): string | null {
  return comment.trim().length > EVALUATION_COMMENT_MAX_LENGTH
    ? `El comentario no puede superar los ${EVALUATION_COMMENT_MAX_LENGTH} caracteres.`
    : null;
}

/** Motivo de disputa: obligatorio (1..1000). */
export const DISPUTE_REASON_MAX_LENGTH = 1000;

export function disputeReasonError(reason: string): string | null {
  const normalized = reason.trim();
  if (normalized.length === 0) {
    return 'Indica el motivo de la disputa.';
  }
  return normalized.length > DISPUTE_REASON_MAX_LENGTH
    ? `El motivo no puede superar los ${DISPUTE_REASON_MAX_LENGTH} caracteres.`
    : null;
}
