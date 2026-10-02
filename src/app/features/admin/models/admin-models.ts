/**
 * Contratos del alcance administrativo (RF-080…RF-085 y RF-073) tal como los
 * exponen los controladores reales de `api/.../moderation`, `identity`,
 * `accommodation`, `catalog` y `reputation` bajo `/api/v1/admin/**`.
 *
 * Hechos verificados en runtime que condicionan la UI:
 * - El namespace `/api/v1/admin/**` exige **rol activo** `MODERADOR` o
 *   `ADMINISTRADOR` (el backend no distingue entre ellos); sin sesión 401 y con
 *   sesión sin rol interno 403, ambos con cuerpo `{message}` (sin `ErrorResponse`).
 * - **No hay paginación ni orden** en ningún endpoint administrativo: las
 *   colecciones llegan completas (volumen de piloto) ⇒ deuda documentada.
 * - Las transiciones inválidas del dominio (`require(...)`) responden **500**, no
 *   400/409: la UI ofrece solo las acciones que el estado real admite y, si el
 *   servidor responde 500, lo comunica tal cual (no se compensa).
 * - **No existe contrato de auditoría** (RF-085): lo único expuesto es la cadena
 *   `events[]` del caso.
 */

import { DocumentStatus, DocumentType } from '../../../core/auth/identity-contract';

export type { DocumentStatus, DocumentType };

// ---------- Moderación (RF-082) ----------

export type CaseType = 'REPORTE' | 'DISPUTA';
export type CaseSubjectType = 'CONVERSACION' | 'EVALUACION' | 'PUBLICACION' | 'USUARIO';
export type CasePriority = 'ALTA' | 'MEDIA' | 'BAJA';
export type CaseStatus = 'ABIERTO' | 'EN_REVISION' | 'RESUELTO' | 'RECHAZADO';
export type CaseEventType = 'ABIERTO' | 'ASIGNADO' | 'EN_REVISION' | 'RESUELTO' | 'RECHAZADO';

/** Caso tal como lo devuelve la cola (`CaseView`). */
export interface CaseView {
  id: string;
  type: CaseType;
  subjectType: CaseSubjectType;
  subjectId: string;
  reportedUserId: string | null;
  openedByUserId: string | null;
  description: string;
  priority: CasePriority;
  status: CaseStatus;
  assigneeUserId: string | null;
  resolution: string | null;
  openedAt: string;
  updatedAt: string;
  closedAt: string | null;
  /** Tiempo de atención medible (RF-082); `null` mientras el caso está abierto. */
  resolutionHours: number | null;
}

/** Entrada de trazabilidad de un caso (`CaseEventView`). */
export interface CaseEventView {
  id: string;
  type: CaseEventType;
  actorUserId: string;
  note: string | null;
  occurredAt: string;
}

/** Caso con su trazabilidad completa (`CaseDetailView`). */
export interface CaseDetailView {
  case: CaseView;
  events: CaseEventView[];
}

/** Filtros reales de la cola; todos opcionales. */
export interface CaseFilters {
  type: CaseType | '';
  status: CaseStatus | '';
  priority: CasePriority | '';
  assigneeUserId: string;
  onlyOpen: boolean;
}

/** Indicadores operativos reales (RF-084): solo de la cola de casos. */
export interface ModerationMetricsView {
  totalCases: number;
  openCases: number;
  inReviewCases: number;
  resolvedCases: number;
  rejectedCases: number;
  averageResolutionHours: number | null;
  openPublicationReports: number;
}

export const MAX_CASE_NOTE_LENGTH = 1000;

export const CASE_TYPE_LABELS: Record<CaseType, string> = {
  REPORTE: 'Reporte',
  DISPUTA: 'Disputa',
};

export const CASE_SUBJECT_LABELS: Record<CaseSubjectType, string> = {
  CONVERSACION: 'Conversación',
  EVALUACION: 'Evaluación',
  PUBLICACION: 'Publicación',
  USUARIO: 'Usuario',
};

export const CASE_PRIORITY_LABELS: Record<CasePriority, string> = {
  ALTA: 'Alta',
  MEDIA: 'Media',
  BAJA: 'Baja',
};

export const CASE_STATUS_LABELS: Record<CaseStatus, string> = {
  ABIERTO: 'Abierto',
  EN_REVISION: 'En revisión',
  RESUELTO: 'Resuelto',
  RECHAZADO: 'Rechazado',
};

export const CASE_STATUS_CLASSES: Record<CaseStatus, string> = {
  ABIERTO: 'bg-accent-500/15 text-accent-600',
  EN_REVISION: 'bg-brand-700/10 text-brand-800',
  RESUELTO: 'bg-emerald-100 text-emerald-800',
  RECHAZADO: 'bg-red-100 text-red-800',
};

export const CASE_PRIORITY_CLASSES: Record<CasePriority, string> = {
  ALTA: 'bg-red-100 text-red-800',
  MEDIA: 'bg-accent-500/15 text-accent-600',
  BAJA: 'bg-soft text-ink',
};

export const CASE_EVENT_LABELS: Record<CaseEventType, string> = {
  ABIERTO: 'Caso abierto',
  ASIGNADO: 'Asignado',
  EN_REVISION: 'Revisión iniciada',
  RESUELTO: 'Resuelto',
  RECHAZADO: 'Rechazado',
};

/** Un caso admite decisiones mientras no sea terminal (`SupportCase.isOpen`). */
export function isCaseOpen(status: CaseStatus): boolean {
  return status === 'ABIERTO' || status === 'EN_REVISION';
}

/** Acciones que el contrato admite según el estado (no se inventan otras). */
export function caseActions(status: CaseStatus): {
  canAssign: boolean;
  canStartReview: boolean;
  canResolve: boolean;
  canReject: boolean;
} {
  const open = isCaseOpen(status);
  return { canAssign: open, canStartReview: open, canResolve: open, canReject: open };
}

/** Nota/resolución/razón de caso: obligatoria y ≤1000 (`SupportCase`). */
export function caseNoteError(value: string, label = 'El motivo'): string | null {
  const normalized = value.trim();
  if (normalized.length === 0) {
    // Formulación neutra en género: la etiqueta puede ser «La nota» o «El motivo».
    return `Falta completar «${label.toLowerCase()}»: la decisión debe quedar trazada.`;
  }
  return normalized.length > MAX_CASE_NOTE_LENGTH
    ? `${label} no puede superar los ${MAX_CASE_NOTE_LENGTH} caracteres.`
    : null;
}

export const EMPTY_CASE_FILTERS: CaseFilters = {
  type: '',
  status: '',
  priority: '',
  assigneeUserId: '',
  onlyOpen: false,
};

/**
 * Filtros ↔ URL: la cola es una superficie operativa que se comparte y se
 * recarga, así que el filtro vive en los *query params* (como la búsqueda de M2)
 * en lugar de en un store.
 */
export function caseFiltersFromParams(params: {
  get(name: string): string | null | undefined;
}): CaseFilters {
  const type = params.get('tipo');
  const status = params.get('estado');
  const priority = params.get('prioridad');
  const assignee = params.get('responsable');
  return {
    type: isCaseType(type) ? type : '',
    status: isCaseStatus(status) ? status : '',
    priority: isCasePriority(priority) ? priority : '',
    assigneeUserId: assignee ?? '',
    onlyOpen: params.get('abiertos') === 'true',
  };
}

export function caseFiltersToParams(filters: CaseFilters): Record<string, string> {
  const params: Record<string, string> = {};
  if (filters.type !== '') params['tipo'] = filters.type;
  if (filters.status !== '') params['estado'] = filters.status;
  if (filters.priority !== '') params['prioridad'] = filters.priority;
  if (filters.assigneeUserId.trim() !== '') params['responsable'] = filters.assigneeUserId.trim();
  if (filters.onlyOpen) params['abiertos'] = 'true';
  return params;
}

function isCaseType(value: string | null | undefined): value is CaseType {
  return value === 'REPORTE' || value === 'DISPUTA';
}

function isCaseStatus(value: string | null | undefined): value is CaseStatus {
  return (
    value === 'ABIERTO' || value === 'EN_REVISION' || value === 'RESUELTO' || value === 'RECHAZADO'
  );
}

function isCasePriority(value: string | null | undefined): value is CasePriority {
  return value === 'ALTA' || value === 'MEDIA' || value === 'BAJA';
}

// ---------- Documentos de verificación (RF-080) ----------

export const DOCUMENT_STATUS_LABELS: Record<DocumentStatus, string> = {
  PENDIENTE: 'Pendiente',
  APROBADO: 'Aprobado',
  RECHAZADO: 'Rechazado',
  CORRECCION_SOLICITADA: 'Corrección solicitada',
};

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  IDENTIDAD: 'Identidad',
  CERTIFICADO_ACADEMICO: 'Certificado académico',
  COMPROBANTE_ESTUDIO: 'Comprobante de estudio',
};

export const DOCUMENT_STATUS_CLASSES: Record<DocumentStatus, string> = {
  PENDIENTE: 'bg-accent-500/15 text-accent-600',
  APROBADO: 'bg-emerald-100 text-emerald-800',
  RECHAZADO: 'bg-red-100 text-red-800',
  CORRECCION_SOLICITADA: 'bg-brand-700/10 text-brand-800',
};

/**
 * Solo un documento `PENDIENTE` puede revisarse (`requirePending`); con cualquier
 * otro estado el backend responde **500**, así que la UI no ofrece la acción.
 */
export function canReviewDocument(status: DocumentStatus): boolean {
  return status === 'PENDIENTE';
}

// ---------- Publicaciones (RF-081) ----------

export type PublicationStatus =
  'BORRADOR' | 'EN_REVISION' | 'PUBLICADA' | 'PAUSADA' | 'OCULTA' | 'ARCHIVADA';

export type ReviewDecision = 'APROBADA' | 'RECHAZADA' | 'CORRECCION_SOLICITADA';

/**
 * Proyección de lectura propia de esta feature (ADR-006): el admin solo necesita
 * estos campos de `PublicationView`; no se importan modelos de `host`/`listings`.
 */
export interface AdminPublicationView {
  id: string;
  unitId: string;
  title: string;
  status: PublicationStatus;
  services: string[];
  applicableRuleCodes: string[];
}

export const PUBLICATION_STATUS_LABELS: Record<PublicationStatus, string> = {
  BORRADOR: 'Borrador',
  EN_REVISION: 'En revisión',
  PUBLICADA: 'Publicada',
  PAUSADA: 'Pausada',
  OCULTA: 'Oculta',
  ARCHIVADA: 'Archivada',
};

export const REVIEW_DECISION_LABELS: Record<ReviewDecision, string> = {
  APROBADA: 'Aprobar',
  RECHAZADA: 'Rechazar',
  CORRECCION_SOLICITADA: 'Solicitar corrección',
};

/** Resultado real de cada decisión (documentado en `Publication.resolveReview`). */
export const REVIEW_DECISION_OUTCOMES: Record<ReviewDecision, string> = {
  APROBADA: 'Pasa a publicada.',
  RECHAZADA: 'Un borrador vuelve a borrador; una publicación visible queda oculta.',
  CORRECCION_SOLICITADA: 'Vuelve a borrador para que el anfitrión corrija.',
};

/**
 * Solo se puede revisar desde `EN_REVISION` (`require` del dominio): fuera de ese
 * estado el backend responde **500**, por lo que la UI no ofrece la acción.
 */
export function canReviewPublication(status: PublicationStatus): boolean {
  return status === 'EN_REVISION';
}

/** La nota es obligatoria salvo al aprobar (`Publication.resolveReview`). */
export function reviewNoteError(decision: ReviewDecision, note: string): string | null {
  return decision === 'APROBADA' ? null : caseNoteError(note, 'La nota');
}

// ---------- Catálogos (RF-083) ----------

export type CatalogCategory =
  | 'INSTITUCION'
  | 'FACULTAD'
  | 'CARRERA'
  | 'CIUDAD'
  | 'SERVICIO'
  | 'REGLA'
  | 'TIPO_HABITACION'
  | 'ACCESIBILIDAD';

/**
 * Categorías que el SRS (RF-083) pone bajo administración: instituciones,
 * facultades, carreras, ciudades, servicios y reglas. El backend también modela
 * `TIPO_HABITACION` y `ACCESIBILIDAD` para los filtros de búsqueda, pero no
 * figuran en el requisito ⇒ **decisión abierta documentada**, sin UI en M6.
 */
export const DOCUMENTED_CATALOG_CATEGORIES: readonly CatalogCategory[] = [
  'INSTITUCION',
  'FACULTAD',
  'CARRERA',
  'CIUDAD',
  'SERVICIO',
  'REGLA',
];

export const CATALOG_CATEGORY_LABELS: Record<CatalogCategory, string> = {
  INSTITUCION: 'Instituciones',
  FACULTAD: 'Facultades',
  CARRERA: 'Carreras',
  CIUDAD: 'Ciudades',
  SERVICIO: 'Servicios',
  REGLA: 'Reglas',
  TIPO_HABITACION: 'Tipos de habitación',
  ACCESIBILIDAD: 'Accesibilidad',
};

/** Jerarquía real (`CatalogCategory.parentCategory`). */
export function catalogParentCategory(category: CatalogCategory): CatalogCategory | null {
  if (category === 'FACULTAD') return 'INSTITUCION';
  if (category === 'CARRERA') return 'FACULTAD';
  return null;
}

export interface CatalogEntryView {
  id: string;
  category: CatalogCategory;
  code: string;
  name: string;
  description: string | null;
  parentId: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export const MAX_CATALOG_CODE_LENGTH = 60;
export const MAX_CATALOG_NAME_LENGTH = 120;
export const MAX_CATALOG_DESCRIPTION_LENGTH = 1000;

export function catalogCodeError(code: string): string | null {
  const normalized = code.trim();
  if (normalized.length === 0) return 'El código es obligatorio.';
  return normalized.length > MAX_CATALOG_CODE_LENGTH
    ? `El código no puede superar los ${MAX_CATALOG_CODE_LENGTH} caracteres.`
    : null;
}

export function catalogNameError(name: string): string | null {
  const normalized = name.trim();
  if (normalized.length === 0) return 'El nombre es obligatorio.';
  return normalized.length > MAX_CATALOG_NAME_LENGTH
    ? `El nombre no puede superar los ${MAX_CATALOG_NAME_LENGTH} caracteres.`
    : null;
}

export function catalogDescriptionError(description: string): string | null {
  return description.trim().length > MAX_CATALOG_DESCRIPTION_LENGTH
    ? `La descripción no puede superar los ${MAX_CATALOG_DESCRIPTION_LENGTH} caracteres.`
    : null;
}

/** El padre es obligatorio en las categorías jerárquicas (validado en backend). */
export function catalogParentError(category: CatalogCategory, parentId: string): string | null {
  const required = catalogParentCategory(category);
  if (required === null) return null;
  return parentId === ''
    ? `Elige una entrada de ${CATALOG_CATEGORY_LABELS[required]} como padre.`
    : null;
}

// ---------- Reglas de beneficio (RF-073) ----------

export interface BenefitRuleView {
  id: string;
  code: string;
  description: string | null;
  minScore: number;
  active: boolean;
  createdAt: string;
}

export const MAX_BENEFIT_CODE_LENGTH = 60;
export const MAX_BENEFIT_DESCRIPTION_LENGTH = 200;
export const MIN_BENEFIT_SCORE = 0;
export const MAX_BENEFIT_SCORE = 5;

export function benefitCodeError(code: string): string | null {
  const normalized = code.trim();
  if (normalized.length === 0) return 'El código es obligatorio.';
  return normalized.length > MAX_BENEFIT_CODE_LENGTH
    ? `El código no puede superar los ${MAX_BENEFIT_CODE_LENGTH} caracteres.`
    : null;
}

export function benefitDescriptionError(description: string): string | null {
  return description.trim().length > MAX_BENEFIT_DESCRIPTION_LENGTH
    ? `La descripción no puede superar los ${MAX_BENEFIT_DESCRIPTION_LENGTH} caracteres.`
    : null;
}

/** `minScore` entre 0 y 5 (`@Min(0) @Max(5)` del contrato real). */
export function benefitMinScoreError(value: string): string | null {
  const normalized = value.trim();
  if (normalized === '') return 'Indica la puntuación mínima del beneficio.';
  const parsed = Number(normalized.replace(',', '.'));
  if (Number.isNaN(parsed)) return 'La puntuación mínima debe ser un número.';
  if (parsed < MIN_BENEFIT_SCORE || parsed > MAX_BENEFIT_SCORE) {
    return `La puntuación mínima debe estar entre ${MIN_BENEFIT_SCORE} y ${MAX_BENEFIT_SCORE}.`;
  }
  return null;
}
