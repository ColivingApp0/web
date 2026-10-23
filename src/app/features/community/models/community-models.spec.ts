import {
  ActivityDetailView,
  ActivityView,
  HostReservationRef,
  HostUnitRef,
  activityCapacityError,
  activityDescriptionError,
  activityParticipantsError,
  activityPhase,
  activityScheduledAtError,
  activityTitleError,
  canConfirm,
  canWithdraw,
  isActivityOpen,
  myParticipation,
  residentCandidates,
} from './community-models';

const now = new Date('2026-11-01T12:00:00Z');

function activity(overrides: Partial<ActivityView> = {}): ActivityView {
  return {
    id: 'a1',
    propertyId: 'prop1',
    hostId: 'host',
    title: 'Asado de bienvenida',
    description: null,
    scheduledAt: '2026-11-10T18:00:00Z',
    capacity: 4,
    status: 'PROGRAMADA',
    confirmedCount: 1,
    freePlaces: 3,
    createdAt: '2026-11-01T10:00:00Z',
    ...overrides,
  };
}

function detail(confirmed = false): ActivityDetailView {
  return {
    activity: activity(),
    participants: [
      { userId: 'guest', status: confirmed ? 'CONFIRMADA' : 'HABILITADO', registeredAt: '' },
    ],
  };
}

describe('fase de la actividad (derivada de la fecha)', () => {
  it('should be open while programmed and in the future', () => {
    expect(activityPhase(activity(), now)).toBe('ABIERTA');
    expect(isActivityOpen(activity(), now)).toBe(true);
  });

  it('should be passed when the date elapsed even if still programmed', () => {
    expect(activityPhase(activity({ scheduledAt: '2026-10-30T18:00:00Z' }), now)).toBe('PASADA');
    expect(isActivityOpen(activity({ scheduledAt: '2026-10-30T18:00:00Z' }), now)).toBe(false);
  });

  it('should be cancelled regardless of the date', () => {
    expect(activityPhase(activity({ status: 'CANCELADA' }), now)).toBe('CANCELADA');
    expect(isActivityOpen(activity({ status: 'CANCELADA' }), now)).toBe(false);
  });
});

describe('participación del residente', () => {
  it('should find the participant row of the user', () => {
    expect(myParticipation(detail(), 'guest')?.status).toBe('HABILITADO');
    expect(myParticipation(detail(), 'otro')).toBeNull();
  });

  it('should allow confirming only when open, enabled, not confirmed and with room', () => {
    expect(canConfirm(activity(), detail().participants[0], now)).toBe(true);
    expect(
      canConfirm(activity(), { userId: 'guest', status: 'CONFIRMADA', registeredAt: '' }, now),
    ).toBe(false);
    expect(canConfirm(activity({ freePlaces: 0 }), detail().participants[0], now)).toBe(false);
    expect(
      canConfirm(activity({ scheduledAt: '2026-10-30T18:00:00Z' }), detail().participants[0], now),
    ).toBe(false);
    expect(canConfirm(activity(), null, now)).toBe(false);
  });

  it('should allow withdrawing only after confirming', () => {
    expect(canWithdraw({ userId: 'guest', status: 'CONFIRMADA', registeredAt: '' })).toBe(true);
    expect(canWithdraw(detail().participants[0])).toBe(false);
    expect(canWithdraw(null)).toBe(false);
  });
});

describe('validaciones locales espejo del contrato', () => {
  it('should require a bounded title', () => {
    expect(activityTitleError('   ')).toContain('título');
    expect(activityTitleError('a'.repeat(120))).toBeNull();
    expect(activityTitleError('a'.repeat(121))).toContain('120');
  });

  it('should bound the optional description', () => {
    expect(activityDescriptionError('')).toBeNull();
    expect(activityDescriptionError('a'.repeat(1001))).toContain('1000');
  });

  it('should require a future date', () => {
    expect(activityScheduledAtError('', now)).toContain('fecha');
    expect(activityScheduledAtError('no-es-fecha', now)).toContain('no son válidas');
    expect(activityScheduledAtError('2026-10-30T18:00:00Z', now)).toContain('futuro');
    expect(activityScheduledAtError('2026-11-10T18:00:00Z', now)).toBeNull();
  });

  it('should require a positive integer capacity', () => {
    expect(activityCapacityError('')).toContain('cupo');
    expect(activityCapacityError('dos')).toContain('entero');
    expect(activityCapacityError('0')).toContain('mayor que cero');
    expect(activityCapacityError('3')).toBeNull();
  });

  it('should require at least one enabled participant', () => {
    expect(activityParticipantsError([])).toContain('al menos un residente');
    expect(activityParticipantsError(['guest'])).toBeNull();
  });
});

describe('residentCandidates (proyección del anfitrión)', () => {
  const units: HostUnitRef[] = [
    { unitId: 'u1', name: 'Loft 301', propertyId: 'prop1' },
    { unitId: 'u2', name: 'Loft 302', propertyId: 'prop1' },
    { unitId: 'u9', name: 'Casa', propertyId: 'prop2' },
  ];

  function reservation(overrides: Partial<HostReservationRef>): HostReservationRef {
    return {
      id: 'r1',
      unitId: 'u1',
      guestUserId: 'guestA',
      status: 'ACEPTADA',
      monthlyPrice: 800000,
      currency: 'COP',
      ...overrides,
    };
  }

  it('should keep only confirmed stays of the property units, grouped by guest', () => {
    const candidates = residentCandidates('prop1', units, [
      reservation({ id: 'r1' }),
      reservation({ id: 'r2', unitId: 'u2' }),
      reservation({ id: 'r3', status: 'SOLICITADA' }),
      reservation({ id: 'r4', unitId: 'u9', guestUserId: 'guestB' }),
      reservation({ id: 'r5', guestUserId: 'guestC', status: 'CANCELADA' }),
    ]);

    expect(candidates).toHaveLength(1);
    expect(candidates[0].userId).toBe('guestA');
    expect(candidates[0].reservations.map((item) => item.id)).toEqual(['r1', 'r2']);
  });

  it('should return nothing for a property without confirmed residents', () => {
    expect(residentCandidates('prop2', units, [reservation({ unitId: 'u1' })])).toEqual([]);
  });
});
