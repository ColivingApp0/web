/**
 * Contratos del contexto `community` (RF-060, RF-061, RF-062) tal como los
 * exponen `api/.../community/presentation` y `application/dto`.
 *
 * Hechos verificados que condicionan la UI:
 * - La actividad solo existe en dos estados (`PROGRAMADA`/`CANCELADA`); «ya pasó»
 *   **se deriva** de `scheduledAt` (no se almacena y no hay scheduler).
 * - La comunidad autorizada de una actividad son **las filas de participante**
 *   creadas al habilitar residentes; no hay endpoint «público» de actividades.
 * - Los residentes de una propiedad son los huéspedes con reserva `CONFIRMADA`
 *   sobre sus unidades (lectura desde `booking`).
 * - La participación puede volver a confirmarse mientras la actividad esté
 *   abierta; retirarse exige estar `CONFIRMADA`.
 * - No hay paginación ni tiempo real en ningún endpoint.
 */

/** Estado real de la actividad (`CommunityActivityStatus`). */
export type CommunityActivityStatus = 'PROGRAMADA' | 'CANCELADA';

/** Estado de la participación del residente (`ParticipationStatus`). */
export type ParticipationStatus = 'HABILITADO' | 'CONFIRMADA' | 'RETIRADA';

/** Respuesta de los listados y del detalle (`ActivityView`). */
export interface ActivityView {
  id: string;
  propertyId: string;
  hostId: string;
  title: string;
  description: string | null;
  /** Instante ISO de celebración (el backend usa `Instant`). */
  scheduledAt: string;
  capacity: number;
  status: CommunityActivityStatus;
  confirmedCount: number;
  freePlaces: number;
  createdAt: string;
}

/** Participante con el estado actual de su asistencia (`ParticipantView`). */
export interface ParticipantView {
  userId: string;
  status: ParticipationStatus;
  registeredAt: string;
}

/** Actividad con sus participantes (`ActivityDetailView`). */
export interface ActivityDetailView {
  activity: ActivityView;
  participants: ParticipantView[];
}

/**
 * Resumen agregado de la comunidad residente de una propiedad (`RF-062`):
 * **solo contadores**, y únicamente cuando al menos un residente consintió
 * (`available`). Nunca nombres, fotos ni contacto.
 */
export interface CommunitySummaryView {
  propertyId: string;
  available: boolean;
  residentCount: number;
  consentedResidentCount: number;
  upcomingActivityCount: number;
}

/** Cuerpo de `POST /api/v1/host/community/activities` (RF-060). */
export interface CreateActivityPayload {
  propertyId: string;
  title: string;
  description: string | null;
  scheduledAt: string;
  capacity: number;
  enabledParticipantIds: string[];
}

/** Límites reales del contrato (`CommunityActivity.create`). */
export const ACTIVITY_TITLE_MAX_LENGTH = 120;
export const ACTIVITY_DESCRIPTION_MAX_LENGTH = 1000;

export const ACTIVITY_STATUS_LABELS: Record<CommunityActivityStatus, string> = {
  PROGRAMADA: 'Programada',
  CANCELADA: 'Cancelada',
};

export const PARTICIPATION_LABELS: Record<ParticipationStatus, string> = {
  HABILITADO: 'Habilitado (sin confirmar)',
  CONFIRMADA: 'Asistencia confirmada',
  RETIRADA: 'Retirado',
};

/** Fase derivada de la actividad: el «ya pasó» no lo dice el backend. */
export type ActivityPhase = 'ABIERTA' | 'CANCELADA' | 'PASADA';

export const ACTIVITY_PHASE_LABELS: Record<ActivityPhase, string> = {
  ABIERTA: 'Admite confirmaciones',
  CANCELADA: 'Cancelada por el anfitrión',
  PASADA: 'La fecha ya pasó',
};

/** Fase real de la actividad: `PROGRAMADA` + fecha futura = abierta. */
export function activityPhase(activity: ActivityView, now: Date): ActivityPhase {
  if (activity.status === 'CANCELADA') {
    return 'CANCELADA';
  }
  return new Date(activity.scheduledAt).getTime() > now.getTime() ? 'ABIERTA' : 'PASADA';
}

/** ¿Admite confirmaciones ahora mismo? (mismo criterio que `requireOpen`). */
export function isActivityOpen(activity: ActivityView, now: Date): boolean {
  return activityPhase(activity, now) === 'ABIERTA';
}

/** Participación del usuario en el detalle, si forma parte de la comunidad. */
export function myParticipation(
  detail: ActivityDetailView,
  userId: string,
): ParticipantView | null {
  return detail.participants.find((participant) => participant.userId === userId) ?? null;
}

/**
 * ¿Tiene sentido ofrecer «confirmar»? Espeja el contrato: actividad abierta,
 * participante habilitado, sin confirmación previa y con cupo libre. El servidor
 * sigue siendo la autoridad (su 409 manda si algo cambió entretanto).
 */
export function canConfirm(
  activity: ActivityView,
  participation: ParticipantView | null,
  now: Date,
): boolean {
  return (
    isActivityOpen(activity, now) &&
    participation !== null &&
    participation.status !== 'CONFIRMADA' &&
    activity.freePlaces > 0
  );
}

/** Retirarse exige una confirmación previa (el backend responde 409 si no). */
export function canWithdraw(participation: ParticipantView | null): boolean {
  return participation?.status === 'CONFIRMADA';
}

/** Validación local del título (1..120, con `trim`). */
export function activityTitleError(title: string): string | null {
  const normalized = title.trim();
  if (normalized.length === 0) {
    return 'Indica un título para la actividad.';
  }
  return normalized.length > ACTIVITY_TITLE_MAX_LENGTH
    ? `El título no puede superar los ${ACTIVITY_TITLE_MAX_LENGTH} caracteres.`
    : null;
}

/** La descripción es opcional pero tiene límite real. */
export function activityDescriptionError(description: string): string | null {
  return description.trim().length > ACTIVITY_DESCRIPTION_MAX_LENGTH
    ? `La descripción no puede superar los ${ACTIVITY_DESCRIPTION_MAX_LENGTH} caracteres.`
    : null;
}

/** Fecha obligatoria y estrictamente futura (el backend responde 400 si no). */
export function activityScheduledAtError(value: string, now: Date): string | null {
  if (value.trim() === '') {
    return 'Indica la fecha y hora de la actividad.';
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return 'La fecha y hora no son válidas.';
  }
  return parsed.getTime() > now.getTime() ? null : 'La actividad debe programarse en el futuro.';
}

/** Cupo obligatorio, entero y positivo. */
export function activityCapacityError(value: string): string | null {
  const normalized = value.trim();
  if (normalized === '') {
    return 'Indica el cupo de la actividad.';
  }
  if (!/^[0-9]+$/.test(normalized)) {
    return 'El cupo debe ser un número entero.';
  }
  return Number(normalized) > 0 ? null : 'El cupo debe ser mayor que cero.';
}

/** Al menos un residente habilitado: sin él la actividad no tendría comunidad. */
export function activityParticipantsError(participantIds: readonly string[]): string | null {
  return participantIds.length === 0 ? 'Selecciona al menos un residente habilitado.' : null;
}

// ---------- Proyección de residentes (lectura estrecha del anfitrión) ----------

/** Propiedad del anfitrión (proyección de `GET /host/properties`). */
export interface HostPropertyRef {
  id: string;
  title: string | null;
}

/** Unidad del anfitrión (proyección de `GET /host/properties/{id}/units`). */
export interface HostUnitRef {
  unitId: string;
  name: string;
  propertyId: string;
}

/** Reserva del anfitrión (proyección de `GET /host/reservations`). */
export interface HostReservationRef {
  id: string;
  unitId: string;
  guestUserId: string;
  status: string;
  fromDate: string;
  toDate: string;
}

/** Residente habilitable: usuario distinto con al menos una estancia confirmada. */
export interface ResidentCandidate {
  userId: string;
  reservations: HostReservationRef[];
}

/**
 * Residentes habilitables de una propiedad, derivados **solo** de los datos
 * propios del anfitrión (`/host/properties` + `/host/reservations`), replicando
 * la regla del backend: huéspedes con reserva `CONFIRMADA` sobre alguna unidad de
 * la propiedad, sin repetir usuario. El backend valida igualmente la pertenencia
 * (responde 400 si se habilita a alguien de fuera).
 */
export function residentCandidates(
  propertyId: string,
  units: readonly HostUnitRef[],
  reservations: readonly HostReservationRef[],
): ResidentCandidate[] {
  const unitIds = new Set(
    units.filter((unit) => unit.propertyId === propertyId).map((unit) => unit.unitId),
  );
  const byUser = new Map<string, HostReservationRef[]>();
  for (const reservation of reservations) {
    if (reservation.status !== 'CONFIRMADA' || !unitIds.has(reservation.unitId)) {
      continue;
    }
    const current = byUser.get(reservation.guestUserId) ?? [];
    current.push(reservation);
    byUser.set(reservation.guestUserId, current);
  }
  return [...byUser.entries()]
    .map(([userId, qualifying]) => ({ userId, reservations: qualifying }))
    .sort((a, b) => a.userId.localeCompare(b.userId));
}
