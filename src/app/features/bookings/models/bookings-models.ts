/**
 * Contratos del contexto `booking` (RF-040..RF-044). Reflejan los DTOs reales
 * (`booking/application/dto/BookingDtos.kt` y `domain/enums/BookingEnums.kt`).
 *
 * Nota de dominio: una reserva congela sus condiciones económicas al crearse
 * (RN-07), por eso `pricePerNight`, `currency` y `cancellationPolicy` vienen en
 * la propia reserva y no se leen de la publicación.
 */

/** Ciclo de vida de una reserva (RF-042). Solo el backend cambia de estado. */
export type ReservationStatus =
  | 'SOLICITADA'
  | 'INFORMACION_SOLICITADA'
  | 'ACEPTADA'
  | 'CONFIRMADA'
  | 'RECHAZADA'
  | 'CANCELADA'
  | 'EXPIRADA';

/** Tipos de entrada del historial (`ReservationEventType`). */
export type ReservationEventType =
  | 'CREADA'
  | 'INFORMACION_SOLICITADA'
  | 'ACEPTADA'
  | 'RECHAZADA'
  | 'CONFIRMADA'
  | 'CANCELADA'
  | 'EXPIRADA';

/** Instantánea de la política de cancelación (copia propia del contexto booking). */
export type BookingCancellationPolicy = 'FLEXIBLE' | 'MODERADA' | 'ESTRICTA';

/** Moneda del snapshot económico (`accommodation` limita a estas dos). */
export type BookingCurrency = 'COP' | 'USD';

/** Respuesta de los endpoints de reservas (`ReservationView`). */
export interface ReservationView {
  id: string;
  unitId: string;
  publicationId: string;
  guestUserId: string;
  /** Fecha inclusive del primer día ([from, to)). */
  fromDate: string;
  /** Fecha exclusiva del último día: las noches son la diferencia. */
  toDate: string;
  occupants: number;
  message: string | null;
  status: ReservationStatus;
  pricePerNight: number;
  currency: BookingCurrency;
  totalPrice: number;
  cancellationPolicy: BookingCancellationPolicy | null;
  /** Fin del hold provisional tras la aceptación (null antes de aceptar). */
  holdExpiresAt: string | null;
  createdAt: string;
}

/** Entrada del historial (`ReservationEventView`), en orden cronológico. */
export interface ReservationEventView {
  id: string;
  reservationId: string;
  type: ReservationEventType;
  actorUserId: string;
  reason: string | null;
  occurredAt: string;
}

/** Cuerpo de `POST /api/v1/reservations`. */
export interface CreateReservationPayload {
  unitId: string;
  fromDate: string;
  toDate: string;
  occupants: number;
  message: string | null;
}

/**
 * Proyección de lectura mínima que el formulario de solicitud necesita de la
 * publicación elegida (capacidad, precio vigente, política y estancias). El
 * backend hace lo mismo con `UnitBookingInfo`: booking no importa los agregados
 * de accommodation, solo una foto de lo que necesita para validar y previsualizar.
 */
export interface BookingContext {
  publicationId: string;
  unitId: string;
  unitName: string;
  propertyTitle: string | null;
  propertyAddress: string | null;
  maxGuests: number;
  pricePerNight: number;
  currency: BookingCurrency;
  cancellationPolicy: BookingCancellationPolicy | null;
  minNights: number | null;
  maxNights: number | null;
}

/** Referencia mínima de una unidad del anfitrión (bandeja de reservas). */
export interface HostUnitRef {
  unitId: string;
  name: string;
  propertyId: string;
}

/** Acción del huésped sobre su propia reserva. */
export type GuestReservationAction = 'confirm' | 'cancel';

/** Acción del anfitrión sobre una reserva recibida. */
export type HostReservationAction = 'accept' | 'reject' | 'request-info' | 'cancel';

export interface ReservationActionOption<T extends string> {
  action: T;
  label: string;
  danger: boolean;
}

const GUEST_ACTION_OPTIONS: Record<
  GuestReservationAction,
  ReservationActionOption<GuestReservationAction>
> = {
  confirm: { action: 'confirm', label: 'Confirmar reserva', danger: false },
  cancel: { action: 'cancel', label: 'Cancelar', danger: true },
};

const HOST_ACTION_OPTIONS: Record<
  HostReservationAction,
  ReservationActionOption<HostReservationAction>
> = {
  accept: { action: 'accept', label: 'Aceptar', danger: false },
  reject: { action: 'reject', label: 'Rechazar', danger: true },
  'request-info': { action: 'request-info', label: 'Pedir información', danger: true },
  cancel: { action: 'cancel', label: 'Cancelar', danger: true },
};

/** Estados desde los que se puede cancelar (`Reservation.cancel`). */
const CANCELLABLE: readonly ReservationStatus[] = [
  'SOLICITADA',
  'INFORMACION_SOLICITADA',
  'ACEPTADA',
  'CONFIRMADA',
];

/**
 * Acciones del huésped según el estado real. «Confirmar» solo aparece en
 * `ACEPTADA`: es la transición `ACEPTADA → CONFIRMADA`, que exige estar dentro
 * del hold (`holdExpiresAt`); si venció, el backend expira y responde 409.
 */
export function guestReservationActions(
  status: ReservationStatus,
): readonly ReservationActionOption<GuestReservationAction>[] {
  const actions: ReservationActionOption<GuestReservationAction>[] = [];
  if (status === 'ACEPTADA') {
    actions.push(GUEST_ACTION_OPTIONS.confirm);
  }
  if (CANCELLABLE.includes(status)) {
    actions.push(GUEST_ACTION_OPTIONS.cancel);
  }
  return actions;
}

/**
 * Acciones del anfitrión según el estado real (RF-041 + RF-044):
 * aceptar/rechazar desde `SOLICITADA` e `INFORMACION_SOLICITADA`, pedir
 * información solo desde `SOLICITADA` y cancelar mientras no sea terminal.
 */
export function hostReservationActions(
  status: ReservationStatus,
): readonly ReservationActionOption<HostReservationAction>[] {
  const actions: ReservationActionOption<HostReservationAction>[] = [];
  if (status === 'SOLICITADA' || status === 'INFORMACION_SOLICITADA') {
    actions.push(HOST_ACTION_OPTIONS.accept, HOST_ACTION_OPTIONS.reject);
  }
  if (status === 'SOLICITADA') {
    actions.push(HOST_ACTION_OPTIONS['request-info']);
  }
  if (CANCELLABLE.includes(status)) {
    actions.push(HOST_ACTION_OPTIONS.cancel);
  }
  return actions;
}

export const RESERVATION_STATUS_LABELS: Record<ReservationStatus, string> = {
  SOLICITADA: 'Solicitada',
  INFORMACION_SOLICITADA: 'Información solicitada',
  ACEPTADA: 'Aceptada',
  CONFIRMADA: 'Confirmada',
  RECHAZADA: 'Rechazada',
  CANCELADA: 'Cancelada',
  EXPIRADA: 'Expirada',
};

export const RESERVATION_STATUS_CLASSES: Record<ReservationStatus, string> = {
  SOLICITADA: 'bg-accent-500/15 text-accent-600',
  INFORMACION_SOLICITADA: 'bg-accent-500/15 text-accent-600',
  ACEPTADA: 'bg-brand-700/10 text-brand-800',
  CONFIRMADA: 'bg-brand-700 text-white',
  RECHAZADA: 'bg-red-100 text-red-800',
  CANCELADA: 'bg-red-100 text-red-800',
  EXPIRADA: 'bg-red-100 text-red-800',
};

export const RESERVATION_EVENT_LABELS: Record<ReservationEventType, string> = {
  CREADA: 'Solicitud creada',
  INFORMACION_SOLICITADA: 'Información solicitada al huésped',
  ACEPTADA: 'Aceptada por el anfitrión',
  RECHAZADA: 'Rechazada por el anfitrión',
  CONFIRMADA: 'Confirmada por el huésped',
  CANCELADA: 'Cancelada',
  EXPIRADA: 'Expirada por falta de confirmación',
};

export const CANCELLATION_POLICY_LABELS: Record<BookingCancellationPolicy, string> = {
  FLEXIBLE: 'Flexible',
  MODERADA: 'Moderada',
  ESTRICTA: 'Estricta',
};

/** Estados terminales: no admiten más acciones (ni del huésped ni del anfitrión). */
export const TERMINAL_RESERVATION_STATUSES: readonly ReservationStatus[] = [
  'RECHAZADA',
  'CANCELADA',
  'EXPIRADA',
];

/**
 * Noches de una estancia en el intervalo `[from, to)` — la misma convención que
 * usan `Reservation.nights` y la disponibilidad. Se parsea en UTC para que el
 * resultado no dependa de la zona horaria del navegador.
 */
export function stayNights(fromDate: string, toDate: string): number {
  const from = Date.UTC(
    Number(fromDate.slice(0, 4)),
    Number(fromDate.slice(5, 7)) - 1,
    Number(fromDate.slice(8, 10)),
  );
  const to = Date.UTC(
    Number(toDate.slice(0, 4)),
    Number(toDate.slice(5, 7)) - 1,
    Number(toDate.slice(8, 10)),
  );
  return Math.round((to - from) / 86_400_000);
}

/** Total del snapshot: precio por noche × noches (misma fórmula que el backend). */
export function reservationTotal(pricePerNight: number, nights: number): number {
  return pricePerNight * nights;
}

/**
 * Un hold vencido significa que la confirmación del huésped será rechazada: el
 * backend expira la reserva y responde 409. La UI lo muestra como aviso; la
 * limpieza real la hace el `@Scheduled` del servidor (cada 60 s), así que el
 * estado puede seguir en `ACEPTADA` unos segundos después del vencimiento.
 */
export function isHoldExpired(holdExpiresAt: string | null, now: Date): boolean {
  if (holdExpiresAt === null) {
    return false;
  }
  return new Date(holdExpiresAt).getTime() < now.getTime();
}
