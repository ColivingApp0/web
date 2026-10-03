import { HttpErrorResponse } from '@angular/common/http';
import { registerLocaleData } from '@angular/common';
import localeEsCo from '@angular/common/locales/es-CO';
import { LOCALE_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { BookingsApi } from '../data-access/bookings-api';
import { ReservationView } from '../models/bookings-models';
import { MyReservationsPage } from './my-reservations-page';

registerLocaleData(localeEsCo);

const pending: ReservationView = {
  id: 'r1',
  unitId: 'u1',
  publicationId: 'p1',
  guestUserId: 'g1',
  fromDate: '2026-11-01',
  toDate: '2026-11-04',
  occupants: 2,
  message: 'Somos dos estudiantes',
  status: 'SOLICITADA',
  pricePerNight: 1200000,
  currency: 'COP',
  totalPrice: 3600000,
  cancellationPolicy: 'MODERADA',
  holdExpiresAt: null,
  createdAt: '2026-10-05T12:00:00Z',
};

const accepted: ReservationView = {
  ...pending,
  status: 'ACEPTADA',
  holdExpiresAt: '2030-01-01T12:00:00Z',
};

function setup(list: ReservationView[]) {
  const api = {
    listMine: vi.fn().mockResolvedValue(list),
    confirm: vi.fn().mockResolvedValue({ ...accepted, status: 'CONFIRMADA' }),
    cancel: vi.fn().mockResolvedValue({ ...accepted, status: 'CANCELADA' }),
  };
  TestBed.configureTestingModule({
    imports: [MyReservationsPage],
    providers: [
      provideRouter([]),
      { provide: LOCALE_ID, useValue: 'es-CO' },
      { provide: BookingsApi, useValue: api },
    ],
  });
  return { api };
}

describe('MyReservationsPage', () => {
  it('should render the reservation with frozen conditions and status', async () => {
    setup([pending]);
    const fixture = TestBed.createComponent(MyReservationsPage);
    await fixture.whenStable();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(text).toContain('Solicitada');
    expect(text).toContain('3 noche(s) · 2 huésped(es)');
    expect(text).toContain('1.200.000');
    expect(text).toContain('3.600.000');
    expect(text).toContain('Moderada');
    expect(text).toContain('Somos dos estudiantes');
  });

  it('should confirm an accepted reservation and refresh the list', async () => {
    const { api } = setup([accepted]);
    const fixture = TestBed.createComponent(MyReservationsPage);
    await fixture.whenStable();
    const host = fixture.nativeElement as HTMLElement;

    const confirm = Array.from(host.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Confirmar reserva'),
    )!;
    confirm.click();

    await vi.waitFor(() => expect(api.confirm).toHaveBeenCalledWith('r1'));
    await vi.waitFor(() => expect(host.textContent).toContain('Reserva confirmada'));
    expect(api.listMine).toHaveBeenCalledTimes(2);
  });

  it('should require a reason before cancelling', async () => {
    const { api } = setup([pending]);
    const fixture = TestBed.createComponent(MyReservationsPage);
    await fixture.whenStable();
    const host = fixture.nativeElement as HTMLElement;

    const cancel = Array.from(host.querySelectorAll('button')).find(
      (button) => button.textContent?.trim() === 'Cancelar',
    )!;
    cancel.click();
    await fixture.whenStable();

    const confirmAction = Array.from(host.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Confirmar acción'),
    )!;
    confirmAction.click();
    await fixture.whenStable();

    expect(host.textContent).toContain('Escribe un motivo para continuar.');
    expect(api.cancel).not.toHaveBeenCalled();

    const reason = host.querySelector<HTMLTextAreaElement>('#reservation-reason-r1')!;
    reason.value = 'Cambio de planes';
    reason.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    confirmAction.click();

    await vi.waitFor(() => expect(api.cancel).toHaveBeenCalledWith('r1', 'Cambio de planes'));
  });

  it('should show the server conflict and reload the list', async () => {
    const { api } = setup([accepted]);
    api.confirm.mockRejectedValue(
      new HttpErrorResponse({
        status: 409,
        error: { code: 'CONFLICT', message: 'Provisional hold expired at 2026-10-06T12:00:00Z' },
      }),
    );
    const fixture = TestBed.createComponent(MyReservationsPage);
    await fixture.whenStable();
    const host = fixture.nativeElement as HTMLElement;

    Array.from(host.querySelectorAll('button'))
      .find((button) => button.textContent?.includes('Confirmar reserva'))!
      .click();

    await vi.waitFor(() => expect(host.textContent).toContain('rechazó la acción'));
    expect(host.textContent).toContain('CONFLICT');
    expect(api.listMine).toHaveBeenCalledTimes(2);
  });

  it('should show the empty state', async () => {
    setup([]);
    const fixture = TestBed.createComponent(MyReservationsPage);
    await fixture.whenStable();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'Aún no has solicitado ninguna reserva.',
    );
  });
});
