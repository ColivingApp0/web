import { HttpErrorResponse } from '@angular/common/http';
import { registerLocaleData } from '@angular/common';
import localeEsCo from '@angular/common/locales/es-CO';
import { LOCALE_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { CommunityApi } from '../data-access/community-api';
import { CommunityResidentsApi } from '../data-access/community-residents-api';
import { ActivityDetailView, ActivityView } from '../models/community-models';
import { HostCommunityPage } from './host-community-page';

registerLocaleData(localeEsCo);

const activity: ActivityView = {
  id: 'a1',
  propertyId: 'prop1',
  hostId: 'host',
  title: 'Asado',
  description: null,
  scheduledAt: '2030-11-10T18:00:00Z',
  capacity: 2,
  status: 'PROGRAMADA',
  confirmedCount: 0,
  freePlaces: 2,
  createdAt: '2026-11-01T10:00:00Z',
};

const detail: ActivityDetailView = {
  activity: { ...activity, confirmedCount: 1, freePlaces: 1 },
  participants: [{ userId: 'guest', status: 'CONFIRMADA', registeredAt: '2026-11-02T10:00:00Z' }],
};

function setup() {
  const api = {
    listHostActivities: vi.fn().mockResolvedValue([activity]),
    hostActivityDetail: vi.fn().mockResolvedValue(detail),
    createActivity: vi.fn().mockResolvedValue(detail),
    cancelActivity: vi.fn().mockResolvedValue({ ...activity, status: 'CANCELADA' }),
    communitySummary: vi.fn().mockResolvedValue({
      propertyId: 'prop1',
      available: true,
      residentCount: 2,
      consentedResidentCount: 1,
      upcomingActivityCount: 1,
    }),
  };
  const residents = {
    hostContext: vi.fn().mockResolvedValue({
      properties: [{ id: 'prop1', title: 'Torre M5' }],
      units: [{ unitId: 'u1', name: 'Loft', propertyId: 'prop1' }],
      reservations: [
        {
          id: 'r1',
          unitId: 'u1',
          guestUserId: 'guest',
          status: 'ACEPTADA',
          monthlyPrice: 800000,
          currency: 'COP',
        },
      ],
    }),
  };
  TestBed.configureTestingModule({
    imports: [HostCommunityPage],
    providers: [
      provideRouter([]),
      { provide: LOCALE_ID, useValue: 'es-CO' },
      { provide: CommunityApi, useValue: api },
      { provide: CommunityResidentsApi, useValue: residents },
    ],
  });
  return { api, residents };
}

describe('HostCommunityPage', () => {
  it('should list the activities of the host', async () => {
    setup();
    const fixture = TestBed.createComponent(HostCommunityPage);
    await fixture.whenStable();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(text).toContain('Comunidad de mis propiedades');
    expect(text).toContain('Asado');
    expect(text).toContain('Ver participantes');
  });

  it('should create an activity with the derived residents', async () => {
    const { api, residents } = setup();
    const fixture = TestBed.createComponent(HostCommunityPage);
    await fixture.whenStable();
    const host = fixture.nativeElement as HTMLElement;

    Array.from(host.querySelectorAll('button'))
      .find((button) => button.textContent?.includes('Nueva actividad'))!
      .click();
    await fixture.whenStable();
    await vi.waitFor(() => expect(residents.hostContext).toHaveBeenCalled());

    const property = host.querySelector<HTMLSelectElement>('#activity-property')!;
    property.value = 'prop1';
    property.dispatchEvent(new Event('change'));
    await fixture.whenStable();

    await vi.waitFor(() => expect(host.textContent).toContain('guest'));
    const participant = host.querySelector<HTMLInputElement>('fieldset input[type="checkbox"]')!;
    participant.checked = true;
    participant.dispatchEvent(new Event('change'));

    const title = host.querySelector<HTMLInputElement>('#activity-title')!;
    title.value = 'Asado';
    title.dispatchEvent(new Event('input'));
    const scheduledAt = host.querySelector<HTMLInputElement>('#activity-scheduled-at')!;
    scheduledAt.value = '2030-11-10T18:00';
    scheduledAt.dispatchEvent(new Event('input'));
    const capacity = host.querySelector<HTMLInputElement>('#activity-capacity')!;
    capacity.value = '2';
    capacity.dispatchEvent(new Event('input'));
    await fixture.whenStable();

    host.querySelector('form')!.dispatchEvent(new Event('submit'));

    await vi.waitFor(() =>
      expect(api.createActivity).toHaveBeenCalledWith({
        propertyId: 'prop1',
        title: 'Asado',
        description: null,
        scheduledAt: new Date('2030-11-10T18:00').toISOString(),
        capacity: 2,
        enabledParticipantIds: ['guest'],
      }),
    );
    await vi.waitFor(() => expect(host.textContent).toContain('creada para 1 residente'));
    expect(api.listHostActivities).toHaveBeenCalledTimes(2);
  });

  it('should cancel an activity and reload', async () => {
    const { api } = setup();
    const fixture = TestBed.createComponent(HostCommunityPage);
    await fixture.whenStable();
    const host = fixture.nativeElement as HTMLElement;

    Array.from(host.querySelectorAll('button'))
      .find((button) => button.textContent?.includes('Cancelar actividad'))!
      .click();

    await vi.waitFor(() => expect(api.cancelActivity).toHaveBeenCalledWith('a1'));
    await vi.waitFor(() => expect(host.textContent).toContain('Actividad cancelada'));
    expect(api.listHostActivities).toHaveBeenCalledTimes(2);
  });

  it('should report a 403 when the detail is not mine', async () => {
    const { api } = setup();
    api.hostActivityDetail.mockRejectedValue(
      new HttpErrorResponse({
        status: 403,
        error: {
          code: 'FORBIDDEN',
          message: 'Only the host of the property manages this activity',
        },
      }),
    );
    const fixture = TestBed.createComponent(HostCommunityPage);
    await fixture.whenStable();
    const host = fixture.nativeElement as HTMLElement;

    Array.from(host.querySelectorAll('button'))
      .find((button) => button.textContent?.includes('Ver participantes'))!
      .click();

    await vi.waitFor(() =>
      expect(host.textContent).toContain('No eres el anfitrión de esa actividad'),
    );
  });

  it('should show the aggregated summary of the selected property', async () => {
    const { api } = setup();
    const fixture = TestBed.createComponent(HostCommunityPage);
    await fixture.whenStable();
    const host = fixture.nativeElement as HTMLElement;

    const select = host.querySelector<HTMLSelectElement>('#summary-property')!;
    select.value = 'prop1';
    select.dispatchEvent(new Event('change'));

    await vi.waitFor(() => expect(api.communitySummary).toHaveBeenCalledWith('prop1'));
    await vi.waitFor(() => expect(host.textContent).toContain('Con consentimiento'));
    expect(host.textContent).toContain('Actividades próximas');
  });
});
