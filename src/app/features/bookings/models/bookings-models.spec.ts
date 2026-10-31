import { describe, expect, it } from 'vitest';
import {
  RESERVATION_STATUS_LABELS,
  guestReservationActions,
  hostReservationActions,
  isActiveReservation,
  priceUnitLabel,
} from './bookings-models';

describe('bookings monthly model', () => {
  it('labels monthly price units explicitly', () => {
    expect(priceUnitLabel('POR_PERSONA')).toBe('por persona / plaza');
    expect(priceUnitLabel('POR_HABITACION')).toBe('por habitación');
  });

  it('uses pending/accepted/closed statuses without nightly states', () => {
    expect(RESERVATION_STATUS_LABELS.SOLICITADA).toBe('Pendiente');
    expect(RESERVATION_STATUS_LABELS.ACEPTADA).toBe('Aceptada');
    expect(isActiveReservation('SOLICITADA')).toBe(true);
    expect(isActiveReservation('ACEPTADA')).toBe(true);
    expect(isActiveReservation('RECHAZADA')).toBe(false);
    expect(isActiveReservation('CANCELADA')).toBe(false);
  });

  it('offers the host accept/reject actions only while the request is open', () => {
    expect(hostReservationActions('SOLICITADA').map((action) => action.action)).toEqual([
      'accept',
      'reject',
      'request-info',
      'cancel',
    ]);
    expect(hostReservationActions('ACEPTADA').map((action) => action.action)).toEqual(['cancel']);
    expect(hostReservationActions('RECHAZADA')).toEqual([]);
  });

  it('lets the guest cancel active requests only', () => {
    expect(guestReservationActions('SOLICITADA').map((action) => action.action)).toEqual([
      'cancel',
    ]);
    expect(guestReservationActions('ACEPTADA').map((action) => action.action)).toEqual(['cancel']);
    expect(guestReservationActions('CANCELADA')).toEqual([]);
  });
});
