import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { BookingLookupApi } from './booking-lookup-api';
import { BookingsApi } from './bookings-api';

const RESERVATION = {
  id: 'r1',
  unitId: 'u1',
  publicationId: 'p1',
  guestUserId: 'g1',
  fromDate: '2026-11-01',
  toDate: '2026-11-04',
  occupants: 2,
  message: 'Hola',
  status: 'SOLICITADA',
  pricePerNight: 1200000,
  currency: 'COP',
  totalPrice: 3600000,
  cancellationPolicy: 'MODERADA',
  holdExpiresAt: null,
  createdAt: '2026-10-05T12:00:00Z',
};

function setup() {
  TestBed.configureTestingModule({
    providers: [provideHttpClient(), provideHttpClientTesting()],
  });
  return {
    api: TestBed.inject(BookingsApi),
    lookups: TestBed.inject(BookingLookupApi),
    http: TestBed.inject(HttpTestingController),
  };
}

describe('BookingsApi (contratos reales)', () => {
  it('should create a reservation with the documented body', async () => {
    const { api, http } = setup();
    const promise = api.create({
      unitId: 'u1',
      fromDate: '2026-11-01',
      toDate: '2026-11-04',
      occupants: 2,
      message: 'Hola',
    });

    const request = http.expectOne('/api/v1/reservations');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      unitId: 'u1',
      fromDate: '2026-11-01',
      toDate: '2026-11-04',
      occupants: 2,
      message: 'Hola',
    });
    request.flush(RESERVATION);

    await expect(promise).resolves.toMatchObject({ id: 'r1', status: 'SOLICITADA' });
  });

  it('should list the guest reservations and confirm/cancel them', async () => {
    const { api, http } = setup();

    const mine = api.listMine();
    http.expectOne('/api/v1/reservations/mine').flush([RESERVATION]);
    await expect(mine).resolves.toHaveLength(1);

    const confirm = api.confirm('r1');
    const confirmRequest = http.expectOne('/api/v1/reservations/r1/confirm');
    expect(confirmRequest.request.method).toBe('POST');
    confirmRequest.flush({ ...RESERVATION, status: 'CONFIRMADA' });
    await expect(confirm).resolves.toMatchObject({ status: 'CONFIRMADA' });

    const cancel = api.cancel('r1', 'Cambio de planes');
    const cancelRequest = http.expectOne('/api/v1/reservations/r1/cancel');
    expect(cancelRequest.request.method).toBe('POST');
    expect(cancelRequest.request.body).toEqual({ reason: 'Cambio de planes' });
    cancelRequest.flush({ ...RESERVATION, status: 'CANCELADA' });
    await expect(cancel).resolves.toMatchObject({ status: 'CANCELADA' });
  });

  it('should use the host endpoints for inbox, decisions and history', async () => {
    const { api, http } = setup();

    const incoming = api.listIncoming();
    http.expectOne('/api/v1/host/reservations').flush([RESERVATION]);
    await expect(incoming).resolves.toHaveLength(1);

    const history = api.history('r1');
    http.expectOne('/api/v1/host/reservations/r1/history').flush([]);
    await expect(history).resolves.toEqual([]);

    const accept = api.accept('r1', null);
    const acceptRequest = http.expectOne('/api/v1/host/reservations/r1/accept');
    expect(acceptRequest.request.body).toEqual({ reason: null });
    acceptRequest.flush({ ...RESERVATION, status: 'ACEPTADA' });
    await expect(accept).resolves.toMatchObject({ status: 'ACEPTADA' });

    const reject = api.reject('r1', 'No disponible');
    const rejectRequest = http.expectOne('/api/v1/host/reservations/r1/reject');
    expect(rejectRequest.request.body).toEqual({ reason: 'No disponible' });
    rejectRequest.flush({ ...RESERVATION, status: 'RECHAZADA' });
    await expect(reject).resolves.toMatchObject({ status: 'RECHAZADA' });

    const info = api.requestInfo('r1', '¿Cuántas personas?');
    http
      .expectOne('/api/v1/host/reservations/r1/request-info')
      .flush({ ...RESERVATION, status: 'INFORMACION_SOLICITADA' });
    await expect(info).resolves.toMatchObject({ status: 'INFORMACION_SOLICITADA' });

    const hostCancel = api.cancelAsHost('r1', 'Mantenimiento');
    const hostCancelRequest = http.expectOne('/api/v1/host/reservations/r1/cancel');
    expect(hostCancelRequest.request.body).toEqual({ reason: 'Mantenimiento' });
    hostCancelRequest.flush({ ...RESERVATION, status: 'CANCELADA' });
    await expect(hostCancel).resolves.toMatchObject({ status: 'CANCELADA' });
  });
});

describe('BookingLookupApi (proyecciones de lectura)', () => {
  it('should project the public publication detail into the booking context', async () => {
    const { lookups, http } = setup();
    const promise = lookups.bookingContext('p1');

    http.expectOne('/api/v1/publications/p1').flush({
      publication: { id: 'p1', unitId: 'u1', title: 'Loft', status: 'PUBLICADA' },
      property: { id: 'prop1', title: 'Edificio', address: 'Cra 45' },
      unit: { id: 'u1', name: 'Loft 301', maxGuests: 2 },
      pricing: { basePricePerNight: 1200000, currency: 'COP' },
      rules: { cancellationPolicy: 'MODERADA', minNights: 3, maxNights: 60 },
    });

    await expect(promise).resolves.toEqual({
      publicationId: 'p1',
      unitId: 'u1',
      unitName: 'Loft 301',
      propertyTitle: 'Edificio',
      propertyAddress: 'Cra 45',
      maxGuests: 2,
      pricePerNight: 1200000,
      currency: 'COP',
      cancellationPolicy: 'MODERADA',
      minNights: 3,
      maxNights: 60,
    });
  });

  it('should flag a publication without pricing (the API would reject the request)', async () => {
    const { lookups, http } = setup();
    const promise = lookups.bookingContext('p1');

    http.expectOne('/api/v1/publications/p1').flush({
      publication: { id: 'p1', unitId: 'u1', title: 'Loft', status: 'BORRADOR' },
      property: { id: 'prop1', title: null, address: null },
      unit: { id: 'u1', name: 'Loft 301', maxGuests: 2 },
      pricing: null,
      rules: null,
    });

    await expect(promise).resolves.toMatchObject({
      pricePerNight: 0,
      currency: 'COP',
      cancellationPolicy: null,
      minNights: null,
    });
  });

  it('should index the host units through the host endpoints only', async () => {
    const { lookups, http } = setup();
    const promise = lookups.hostUnits();

    http.expectOne('/api/v1/host/properties').flush([{ id: 'prop1', title: 'Edificio' }]);
    // La petición de unidades se emite cuando responde la de propiedades.
    await vi.waitFor(() => {
      http.expectOne('/api/v1/host/properties/prop1/units').flush([{ id: 'u1', name: 'Loft 301' }]);
    });

    await expect(promise).resolves.toEqual([
      { unitId: 'u1', name: 'Loft 301', propertyId: 'prop1' },
    ]);
  });
});
