import { HttpErrorResponse } from '@angular/common/http';
import { registerLocaleData } from '@angular/common';
import localeEsCo from '@angular/common/locales/es-CO';
import { LOCALE_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { BookingLookupApi } from '../data-access/booking-lookup-api';
import { BookingsApi } from '../data-access/bookings-api';
import { ReservationView } from '../models/bookings-models';
import { HostReservationsPage } from './host-reservations-page';

registerLocaleData(localeEsCo);

const requested: ReservationView = {
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

function setup(reservations: ReservationView[]) {
  const api = {
    listIncoming: vi.fn().mockResolvedValue(reservations),
    history: vi.fn().mockResolvedValue([
      {
        id: 'e1',
        reservationId: 'r1',
        type: 'CREADA',
        actorUserId: 'g1',
        reason: null,
        occurredAt: '2026-10-05T12:00:00Z',
      },
    ]),
    accept: vi.fn().mockResolvedValue({ ...requested, status: 'ACEPTADA' }),
    reject: vi.fn().mockResolvedValue({ ...requested, status: 'RECHAZADA' }),
    requestInfo: vi.fn().mockResolvedValue({ ...requested, status: 'INFORMACION_SOLICITADA' }),
    cancelAsHost: vi.fn().mockResolvedValue({ ...requested, status: 'CANCELADA' }),
  };
  const lookups = {
    hostUnits: vi.fn().mockResolvedValue([{ unitId: 'u1', name: 'Loft 301', propertyId: 'prop1' }]),
  };
  TestBed.configureTestingModule({
    imports: [HostReservationsPage],
    providers: [
      provideRouter([]),
      { provide: LOCALE_ID, useValue: 'es-CO' },
      { provide: BookingsApi, useValue: api },
      { provide: BookingLookupApi, useValue: lookups },
    ],
  });
  return { api, lookups };
}

describe('HostReservationsPage', () => {
  it('should render the incoming request with its unit name', async () => {
    const { lookups } = setup([requested]);
    const fixture = TestBed.createComponent(HostReservationsPage);
    await fixture.whenStable();
    const host = fixture.nativeElement as HTMLElement;

    await vi.waitFor(() => expect(lookups.hostUnits).toHaveBeenCalled());
    await vi.waitFor(() => expect(host.textContent).toContain('Loft 301'));
    const text = host.textContent ?? '';
    expect(text).toContain('Solicitada');
    expect(text).toContain('3 noche(s) · 2 huésped(es)');
    expect(text).toContain('Gestionar la unidad');
  });

  it('should accept a request and refresh the inbox', async () => {
    const { api } = setup([requested]);
    const fixture = TestBed.createComponent(HostReservationsPage);
    await fixture.whenStable();
    const host = fixture.nativeElement as HTMLElement;

    Array.from(host.querySelectorAll('button'))
      .find((button) => button.textContent?.trim() === 'Aceptar')!
      .click();

    await vi.waitFor(() => expect(api.accept).toHaveBeenCalledWith('r1', null));
    await vi.waitFor(() => expect(host.textContent).toContain('Solicitud aceptada'));
    expect(api.listIncoming).toHaveBeenCalledTimes(2);
  });

  it('should surface a race conflict on accept and keep the real state', async () => {
    const { api } = setup([requested]);
    api.accept.mockRejectedValue(
      new HttpErrorResponse({
        status: 409,
        error: { code: 'CONFLICT', message: 'Day 2026-11-02 is not available (state=BLOQUEADO)' },
      }),
    );
    const fixture = TestBed.createComponent(HostReservationsPage);
    await fixture.whenStable();
    const host = fixture.nativeElement as HTMLElement;

    Array.from(host.querySelectorAll('button'))
      .find((button) => button.textContent?.trim() === 'Aceptar')!
      .click();

    await vi.waitFor(() => expect(host.textContent).toContain('rechazó la acción'));
    expect(host.textContent).toContain('is not available');
    expect(api.listIncoming).toHaveBeenCalledTimes(2);
  });

  it('should request the history only when the host asks for it', async () => {
    const { api } = setup([requested]);
    const fixture = TestBed.createComponent(HostReservationsPage);
    await fixture.whenStable();
    const host = fixture.nativeElement as HTMLElement;

    expect(api.history).not.toHaveBeenCalled();
    Array.from(host.querySelectorAll('button'))
      .find((button) => button.textContent?.includes('Ver historial'))!
      .click();

    await vi.waitFor(() => expect(api.history).toHaveBeenCalledWith('r1'));
    await vi.waitFor(() => expect(host.textContent).toContain('Solicitud creada'));
  });

  it('should show the empty state when there are no requests', async () => {
    setup([]);
    const fixture = TestBed.createComponent(HostReservationsPage);
    await fixture.whenStable();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'No tienes solicitudes por ahora.',
    );
  });
});
