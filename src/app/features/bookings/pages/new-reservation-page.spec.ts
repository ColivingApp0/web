import { HttpErrorResponse } from '@angular/common/http';
import { registerLocaleData } from '@angular/common';
import localeEsCo from '@angular/common/locales/es-CO';
import { LOCALE_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { BookingLookupApi } from '../data-access/booking-lookup-api';
import { BookingsApi } from '../data-access/bookings-api';
import { BookingContext } from '../models/bookings-models';
import { NewReservationPage } from './new-reservation-page';

registerLocaleData(localeEsCo);

const context: BookingContext = {
  publicationId: 'p1',
  unitId: 'u1',
  unitName: 'Loft 301',
  propertyTitle: 'Edificio Aurora',
  propertyAddress: 'Cra 45 #12-30',
  maxGuests: 2,
  pricePerNight: 1200000,
  currency: 'COP',
  cancellationPolicy: 'MODERADA',
  minNights: 3,
  maxNights: 60,
};

const query = {
  publication: 'p1',
  unidad: 'u1',
  desde: '2026-11-01',
  hasta: '2026-11-04',
  huespedes: '2',
};

function setup(search: Record<string, string>, bookingContext: BookingContext = context) {
  const lookups = { bookingContext: vi.fn().mockResolvedValue(bookingContext) };
  const api = { create: vi.fn().mockResolvedValue({ id: 'r9', status: 'SOLICITADA' }) };
  TestBed.configureTestingModule({
    imports: [NewReservationPage],
    providers: [
      provideRouter([]),
      { provide: LOCALE_ID, useValue: 'es-CO' },
      { provide: ActivatedRoute, useValue: { queryParamMap: of(convertToParamMap(search)) } },
      { provide: BookingLookupApi, useValue: lookups },
      { provide: BookingsApi, useValue: api },
    ],
  });
  return { api, lookups };
}

describe('NewReservationPage', () => {
  it('should prefill from the listing detail and preview the frozen total', async () => {
    const { lookups } = setup(query);
    const fixture = TestBed.createComponent(NewReservationPage);
    await fixture.whenStable();
    const host = fixture.nativeElement as HTMLElement;

    await vi.waitFor(() => expect(lookups.bookingContext).toHaveBeenCalledWith('p1'));
    await vi.waitFor(() => expect(host.textContent).toContain('Loft 301'));
    expect((host.querySelector('#booking-from') as HTMLInputElement).value).toBe('2026-11-01');
    expect((host.querySelector('#booking-to') as HTMLInputElement).value).toBe('2026-11-04');
    expect((host.querySelector('#booking-occupants') as HTMLInputElement).value).toBe('2');
    const text = host.textContent ?? '';
    expect(text).toContain('3 noche(s)');
    expect(text).toContain('1.200.000');
    expect(text).toContain('3.600.000');
    expect(text).toContain('Moderada');
  });

  it('should send the documented payload on submit', async () => {
    const { api } = setup(query);
    const fixture = TestBed.createComponent(NewReservationPage);
    await fixture.whenStable();
    const host = fixture.nativeElement as HTMLElement;

    const message = host.querySelector<HTMLTextAreaElement>('#booking-message')!;
    message.value = 'Hola, somos dos estudiantes.';
    message.dispatchEvent(new Event('input'));
    host.querySelector('form')!.dispatchEvent(new Event('submit'));

    await vi.waitFor(() =>
      expect(api.create).toHaveBeenCalledWith({
        unitId: 'u1',
        fromDate: '2026-11-01',
        toDate: '2026-11-04',
        occupants: 2,
        message: 'Hola, somos dos estudiantes.',
      }),
    );
  });

  it('should block an inverted range without calling the API', async () => {
    const { api } = setup(query);
    const fixture = TestBed.createComponent(NewReservationPage);
    await fixture.whenStable();
    const host = fixture.nativeElement as HTMLElement;

    const to = host.querySelector<HTMLInputElement>('#booking-to')!;
    to.value = '2026-10-30';
    to.dispatchEvent(new Event('input'));
    host.querySelector('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();

    expect(host.textContent).toContain('posterior');
    expect(api.create).not.toHaveBeenCalled();
  });

  it('should reject more occupants than the unit capacity', async () => {
    const { api } = setup({ ...query, huespedes: '5' });
    const fixture = TestBed.createComponent(NewReservationPage);
    await fixture.whenStable();
    const host = fixture.nativeElement as HTMLElement;

    host.querySelector('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();

    expect(host.textContent).toContain('admite como máximo 2 huésped(es)');
    expect(api.create).not.toHaveBeenCalled();
  });

  it('should reflect a 409 conflict from the server', async () => {
    const { api } = setup(query);
    api.create.mockRejectedValue(
      new HttpErrorResponse({
        status: 409,
        error: { code: 'CONFLICT', message: 'The requested dates are not available' },
      }),
    );
    const fixture = TestBed.createComponent(NewReservationPage);
    await fixture.whenStable();
    const host = fixture.nativeElement as HTMLElement;

    host.querySelector('form')!.dispatchEvent(new Event('submit'));

    await vi.waitFor(() => expect(host.textContent).toContain('no aceptó la solicitud'));
    expect(host.textContent).toContain('CONFLICT');
    expect(host.textContent).toContain('The requested dates are not available');
  });

  it('should explain the verification gate on 403', async () => {
    const { api } = setup(query);
    api.create.mockRejectedValue(
      new HttpErrorResponse({
        status: 403,
        error: { code: 'FORBIDDEN', message: 'Guest verification level does not meet the minimum' },
      }),
    );
    const fixture = TestBed.createComponent(NewReservationPage);
    await fixture.whenStable();
    const host = fixture.nativeElement as HTMLElement;

    host.querySelector('form')!.dispatchEvent(new Event('submit'));

    await vi.waitFor(() => expect(host.textContent).toContain('denegó la solicitud'));
    expect(host.textContent).toContain('Revisar mi verificación de identidad');
  });

  it('should warn when the publication has no pricing', async () => {
    setup(query, { ...context, pricePerNight: 0, cancellationPolicy: null });
    const fixture = TestBed.createComponent(NewReservationPage);
    await fixture.whenStable();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'no tiene precio configurado',
    );
  });
});
