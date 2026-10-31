/**
 * Contratos del contexto `booking` para **renta mensual**. Una solicitud pide
 * una plaza de una habitación; no tiene fechas, noches ni total por duración.
 * El precio mensual se congela al crear la solicitud (RN-07).
 */

export type ReservationStatus =
  | 'SOLICITADA'
  | 'INFORMACION_SOLICITADA'
  | 'ACEPTADA'
  | 'CONFIRMADA'
  | 'RECHAZADA'
  | 'CANCELADA'
  | 'EXPIRADA';

export type ReservationEventType =
  | 'CREADA'
  | 'INFORMACION_SOLICITADA'
  | 'ACEPTADA'
  | 'RECHAZADA'
  | 'CONFIRMADA'
  | 'CANCELADA'
  | 'EXPIRADA';

export type BookingCurrency = 'COP' | 'USD';
export type BookingPriceUnit = 'POR_HABITACION' | 'POR_PERSONA';

export interface ReservationView {
  id: string;
  unitId: string;
  publicationId: string;
  guestUserId: string;
  places: number;
  message: string | null;
  status: ReservationStatus;
  monthlyPrice: number | null;
  currency: string;
  priceUnit: string | null;
  unitName: string | null;
  propertyTitle: string | null;
  cityName: string | null;
  photoUrl: string | null;
  createdAt: string;
}

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
  places: number;
  message: string | null;
}

/** Foto mínima de la habitación que necesita el formulario de solicitud. */
export interface BookingContext {
  publicationId: string;
  unitId: string;
  unitName: string;
  propertyTitle: string | null;
  cityName: string | null;
  neighborhood: string | null;
  maxGuests: number;
  occupiedPlaces: number;
  availablePlaces: number;
  monthlyPrice: number;
  currency: BookingCurrency;
  priceUnit: BookingPriceUnit;
  photoUrl: string | null;
  published: boolean;
  effectiveAvailable: boolean;
}

export interface GuestUnitRef {
  unitId: string;
  name: string;
  propertyId: string;
}

export type GuestReservationAction = 'cancel';
export type HostReservationAction = 'accept' | 'reject' | 'request-info' | 'cancel';

export interface ReservationActionOption<T extends string> {
  action: T;
  label: string;
  danger: boolean;
}

export function guestReservationActions(
  status: ReservationStatus,
): readonly ReservationActionOption<GuestReservationAction>[] {
  return ['SOLICITADA', 'INFORMACION_SOLICITADA', 'ACEPTADA', 'CONFIRMADA'].includes(status)
    ? [{ action: 'cancel', label: 'Cancelar solicitud', danger: true }]
    : [];
}

export function hostReservationActions(
  status: ReservationStatus,
): readonly ReservationActionOption<HostReservationAction>[] {
  const actions: ReservationActionOption<HostReservationAction>[] = [];
  if (status === 'SOLICITADA' || status === 'INFORMACION_SOLICITADA') {
    actions.push({ action: 'accept', label: 'Aceptar', danger: false });
    actions.push({ action: 'reject', label: 'Rechazar', danger: true });
  }
  if (status === 'SOLICITADA') {
    actions.push({ action: 'request-info', label: 'Pedir información', danger: false });
  }
  if (['SOLICITADA', 'INFORMACION_SOLICITADA', 'ACEPTADA', 'CONFIRMADA'].includes(status)) {
    actions.push({ action: 'cancel', label: 'Cancelar', danger: true });
  }
  return actions;
}

export const RESERVATION_STATUS_LABELS: Record<ReservationStatus, string> = {
  SOLICITADA: 'Pendiente',
  INFORMACION_SOLICITADA: 'Información solicitada',
  ACEPTADA: 'Aceptada',
  CONFIRMADA: 'Aceptada',
  RECHAZADA: 'Rechazada',
  CANCELADA: 'Cancelada',
  EXPIRADA: 'Expirada',
};

export const RESERVATION_STATUS_CLASSES: Record<ReservationStatus, string> = {
  SOLICITADA: 'bg-warning-50 text-warning-700 border-accent-200',
  INFORMACION_SOLICITADA: 'bg-sky-soft text-[#0c4a6e] border-[#bae6fd]',
  ACEPTADA: 'bg-brand-50 text-brand-800 border-brand-200',
  CONFIRMADA: 'bg-brand-50 text-brand-800 border-brand-200',
  RECHAZADA: 'bg-danger-50 text-danger-700 border-danger-100',
  CANCELADA: 'bg-soft text-muted border-line',
  EXPIRADA: 'bg-soft text-muted border-line',
};

export const RESERVATION_EVENT_LABELS: Record<ReservationEventType, string> = {
  CREADA: 'Solicitud creada',
  INFORMACION_SOLICITADA: 'Información solicitada al huésped',
  ACEPTADA: 'Aceptada por el anfitrión',
  RECHAZADA: 'Rechazada por el anfitrión',
  CONFIRMADA: 'Aceptada (registro histórico)',
  CANCELADA: 'Cancelada',
  EXPIRADA: 'Expirada (registro histórico)',
};

export const TERMINAL_RESERVATION_STATUSES: readonly ReservationStatus[] = [
  'RECHAZADA',
  'CANCELADA',
  'EXPIRADA',
];

export function priceUnitLabel(unit: string | null): string {
  return unit === 'POR_PERSONA' ? 'por persona / plaza' : 'por habitación';
}

export function isActiveReservation(status: ReservationStatus): boolean {
  return !TERMINAL_RESERVATION_STATUSES.includes(status);
}
