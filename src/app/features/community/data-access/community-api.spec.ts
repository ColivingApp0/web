import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { CommunityApi } from './community-api';
import { CommunityResidentsApi } from './community-residents-api';

const ACTIVITY = {
  id: 'a1',
  propertyId: 'prop1',
  hostId: 'host',
  title: 'Asado',
  description: null,
  scheduledAt: '2026-11-10T18:00:00Z',
  capacity: 4,
  status: 'PROGRAMADA',
  confirmedCount: 0,
  freePlaces: 4,
  createdAt: '2026-11-01T10:00:00Z',
};

const PARTICIPANT = { userId: 'guest', status: 'ACEPTADA', registeredAt: '2026-11-02T10:00:00Z' };

const DETAIL = {
  activity: { ...ACTIVITY, confirmedCount: 1, freePlaces: 3 },
  participants: [PARTICIPANT],
};

function setup() {
  TestBed.configureTestingModule({
    providers: [provideHttpClient(), provideHttpClientTesting()],
  });
  return {
    api: TestBed.inject(CommunityApi),
    residents: TestBed.inject(CommunityResidentsApi),
    http: TestBed.inject(HttpTestingController),
  };
}

describe('CommunityApi (contratos reales)', () => {
  it('should use the resident endpoints', async () => {
    const { api, http } = setup();

    const list = api.listMyActivities();
    http.expectOne('/api/v1/community/activities').flush([ACTIVITY]);
    await expect(list).resolves.toHaveLength(1);

    const detail = api.activityDetail('a1');
    http.expectOne('/api/v1/community/activities/a1').flush(DETAIL);
    await expect(detail).resolves.toMatchObject({ participants: [PARTICIPANT] });

    const confirm = api.confirmAttendance('a1');
    const confirmRequest = http.expectOne('/api/v1/community/activities/a1/confirm');
    expect(confirmRequest.request.method).toBe('POST');
    confirmRequest.flush(PARTICIPANT);
    await expect(confirm).resolves.toMatchObject({ status: 'ACEPTADA' });

    const withdraw = api.withdrawFromActivity('a1');
    http
      .expectOne('/api/v1/community/activities/a1/withdraw')
      .flush({ ...PARTICIPANT, status: 'RETIRADA' });
    await expect(withdraw).resolves.toMatchObject({ status: 'RETIRADA' });

    const summary = api.communitySummary('prop1');
    const summaryRequest = http.expectOne('/api/v1/community/summary?propertyId=prop1');
    expect(summaryRequest.request.method).toBe('GET');
    summaryRequest.flush({
      propertyId: 'prop1',
      available: true,
      residentCount: 3,
      consentedResidentCount: 2,
      upcomingActivityCount: 1,
    });
    await expect(summary).resolves.toMatchObject({ available: true, residentCount: 3 });
  });

  it('should use the host endpoints', async () => {
    const { api, http } = setup();

    const list = api.listHostActivities();
    http.expectOne('/api/v1/host/community/activities').flush([ACTIVITY]);
    await expect(list).resolves.toHaveLength(1);

    const detail = api.hostActivityDetail('a1');
    http.expectOne('/api/v1/host/community/activities/a1').flush(DETAIL);
    await expect(detail).resolves.toMatchObject({ activity: { id: 'a1' } });

    const create = api.createActivity({
      propertyId: 'prop1',
      title: 'Asado',
      description: null,
      scheduledAt: '2026-11-10T18:00:00Z',
      capacity: 4,
      enabledParticipantIds: ['guest'],
    });
    const createRequest = http.expectOne('/api/v1/host/community/activities');
    expect(createRequest.request.method).toBe('POST');
    expect(createRequest.request.body).toEqual({
      propertyId: 'prop1',
      title: 'Asado',
      description: null,
      scheduledAt: '2026-11-10T18:00:00Z',
      capacity: 4,
      enabledParticipantIds: ['guest'],
    });
    createRequest.flush(DETAIL);
    await expect(create).resolves.toMatchObject({ activity: { id: 'a1' } });

    const cancel = api.cancelActivity('a1');
    http
      .expectOne('/api/v1/host/community/activities/a1/cancel')
      .flush({ ...ACTIVITY, status: 'CANCELADA' });
    await expect(cancel).resolves.toMatchObject({ status: 'CANCELADA' });
  });
});

describe('CommunityResidentsApi (proyección estrecha del anfitrión)', () => {
  it('should compose properties, units and reservations and derive residents', async () => {
    const { residents, http } = setup();
    const promise = residents.hostContext();

    http.expectOne('/api/v1/host/properties').flush([{ id: 'prop1', title: 'Torre' }]);
    await vi.waitFor(() =>
      http.expectOne('/api/v1/host/properties/prop1/units').flush([{ id: 'u1', name: 'Loft' }]),
    );
    await vi.waitFor(() =>
      http.expectOne('/api/v1/host/reservations').flush([
        {
          id: 'r1',
          unitId: 'u1',
          guestUserId: 'guest',
          status: 'ACEPTADA',
          monthlyPrice: 800000,
          currency: 'COP',
        },
      ]),
    );

    const context = await promise;
    expect(context.properties).toEqual([{ id: 'prop1', title: 'Torre' }]);
    expect(context.units).toEqual([{ unitId: 'u1', name: 'Loft', propertyId: 'prop1' }]);
    expect(residents.residentsOf(context, 'prop1')).toEqual([
      {
        userId: 'guest',
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
      },
    ]);
  });
});
