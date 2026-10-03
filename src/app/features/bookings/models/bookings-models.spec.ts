import {
  guestReservationActions,
  hostReservationActions,
  isHoldExpired,
  reservationTotal,
  ReservationStatus,
  stayNights,
} from './bookings-models';

const GUEST_MATRIX: Record<ReservationStatus, string[]> = {
  SOLICITADA: ['cancel'],
  INFORMACION_SOLICITADA: ['cancel'],
  ACEPTADA: ['confirm', 'cancel'],
  CONFIRMADA: ['cancel'],
  RECHAZADA: [],
  CANCELADA: [],
  EXPIRADA: [],
};

const HOST_MATRIX: Record<ReservationStatus, string[]> = {
  SOLICITADA: ['accept', 'reject', 'request-info', 'cancel'],
  INFORMACION_SOLICITADA: ['accept', 'reject', 'cancel'],
  ACEPTADA: ['cancel'],
  CONFIRMADA: ['cancel'],
  RECHAZADA: [],
  CANCELADA: [],
  EXPIRADA: [],
};

describe('guestReservationActions', () => {
  for (const [status, expected] of Object.entries(GUEST_MATRIX)) {
    it(`should map ${status} to ${expected.join(', ') || 'no actions'}`, () => {
      expect(
        guestReservationActions(status as ReservationStatus).map((option) => option.action),
      ).toEqual(expected);
    });
  }

  it('should only offer confirmation while the reservation is accepted', () => {
    expect(guestReservationActions('ACEPTADA').map((option) => option.action)).toContain('confirm');
    expect(guestReservationActions('SOLICITADA').map((option) => option.action)).not.toContain(
      'confirm',
    );
  });
});

describe('hostReservationActions', () => {
  for (const [status, expected] of Object.entries(HOST_MATRIX)) {
    it(`should map ${status} to ${expected.join(', ') || 'no actions'}`, () => {
      expect(
        hostReservationActions(status as ReservationStatus).map((option) => option.action),
      ).toEqual(expected);
    });
  }

  it('should only offer asking for information from the requested state', () => {
    expect(hostReservationActions('SOLICITADA').map((option) => option.action)).toContain(
      'request-info',
    );
    expect(
      hostReservationActions('INFORMACION_SOLICITADA').map((option) => option.action),
    ).not.toContain('request-info');
  });
});

describe('stayNights', () => {
  it('should count nights of the [from, to) interval', () => {
    expect(stayNights('2026-11-01', '2026-11-05')).toBe(4);
    expect(stayNights('2026-11-01', '2026-11-02')).toBe(1);
    expect(stayNights('2026-11-01', '2026-11-01')).toBe(0);
  });

  it('should not depend on the timezone (no DST drift)', () => {
    expect(stayNights('2026-03-05', '2026-03-12')).toBe(7);
    expect(stayNights('2026-10-30', '2026-11-02')).toBe(3);
    expect(stayNights('2026-12-28', '2027-01-04')).toBe(7);
  });

  it('should keep the 366-night contract limit measurable', () => {
    expect(stayNights('2026-01-01', '2027-01-02')).toBe(366);
  });
});

describe('reservationTotal', () => {
  it('should multiply the frozen price by the nights (RN-07)', () => {
    expect(reservationTotal(1200000, 3)).toBe(3600000);
    expect(reservationTotal(850000.5, 2)).toBe(1700001);
  });
});

describe('isHoldExpired', () => {
  const now = new Date('2026-10-05T12:00:00Z');

  it('should report no expiry without a hold', () => {
    expect(isHoldExpired(null, now)).toBe(false);
  });

  it('should detect a past hold and accept a future one', () => {
    expect(isHoldExpired('2026-10-05T11:59:59Z', now)).toBe(true);
    expect(isHoldExpired('2026-10-06T12:00:00Z', now)).toBe(false);
  });
});
