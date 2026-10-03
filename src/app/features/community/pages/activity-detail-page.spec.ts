import { HttpErrorResponse } from '@angular/common/http';
import { registerLocaleData } from '@angular/common';
import localeEsCo from '@angular/common/locales/es-CO';
import { LOCALE_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AuthSession } from '../../../core/auth/auth-session';
import { CommunityApi } from '../data-access/community-api';
import { ActivityDetailView, CommunitySummaryView } from '../models/community-models';
import { ActivityDetailPage } from './activity-detail-page';

registerLocaleData(localeEsCo);

const detail: ActivityDetailView = {
  activity: {
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
  },
  participants: [
    { userId: 'guest', status: 'HABILITADO', registeredAt: '2026-11-01T10:00:00Z' },
    { userId: 'otro', status: 'CONFIRMADA', registeredAt: '2026-11-02T10:00:00Z' },
  ],
};

const summary: CommunitySummaryView = {
  propertyId: 'prop1',
  available: true,
  residentCount: 3,
  consentedResidentCount: 2,
  upcomingActivityCount: 1,
};

function setup(options: { summary?: CommunitySummaryView } = {}) {
  const api = {
    activityDetail: vi.fn().mockResolvedValue(detail),
    communitySummary: vi.fn().mockResolvedValue(options.summary ?? summary),
    confirmAttendance: vi.fn().mockResolvedValue({
      userId: 'guest',
      status: 'CONFIRMADA',
      registeredAt: '2026-11-03T10:00:00Z',
    }),
    withdrawFromActivity: vi.fn(),
  };
  TestBed.configureTestingModule({
    imports: [ActivityDetailPage],
    providers: [
      provideRouter([]),
      { provide: LOCALE_ID, useValue: 'es-CO' },
      { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ id: 'a1' })) } },
      { provide: AuthSession, useValue: { user: () => ({ userId: 'guest' }) } },
      { provide: CommunityApi, useValue: api },
    ],
  });
  return { api };
}

describe('ActivityDetailPage', () => {
  it('should render the activity, the authorized community and the gated summary', async () => {
    setup();
    const fixture = TestBed.createComponent(ActivityDetailPage);
    await fixture.whenStable();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(text).toContain('Asado');
    expect(text).toContain('Comunidad autorizada');
    expect(text).toContain('guest');
    expect(text).toContain('Habilitado (sin confirmar)');
    expect(text).toContain('Asistencia confirmada');
    expect(text).toContain('Residentes');
    expect(text).toContain('2');
  });

  it('should not show counts when consent is not enough', async () => {
    setup({ summary: { ...summary, available: false, consentedResidentCount: 0 } });
    const fixture = TestBed.createComponent(ActivityDetailPage);
    await fixture.whenStable();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(text).toContain('consentimiento suficiente');
    expect(text).not.toContain('Con consentimiento');
  });

  it('should confirm attendance and reload the real state', async () => {
    const { api } = setup();
    const fixture = TestBed.createComponent(ActivityDetailPage);
    await fixture.whenStable();
    const host = fixture.nativeElement as HTMLElement;

    Array.from(host.querySelectorAll('button'))
      .find((button) => button.textContent?.includes('Confirmar asistencia'))!
      .click();

    await vi.waitFor(() => expect(api.confirmAttendance).toHaveBeenCalledWith('a1'));
    await vi.waitFor(() => expect(host.textContent).toContain('Asistencia confirmada.'));
    expect(api.activityDetail).toHaveBeenCalledTimes(2);
  });

  it('should reflect the real 409 (no free places) and refresh', async () => {
    const { api } = setup();
    api.confirmAttendance.mockRejectedValue(
      new HttpErrorResponse({
        status: 409,
        error: { code: 'CONFLICT', message: 'The activity has no free places left' },
      }),
    );
    const fixture = TestBed.createComponent(ActivityDetailPage);
    await fixture.whenStable();
    const host = fixture.nativeElement as HTMLElement;

    Array.from(host.querySelectorAll('button'))
      .find((button) => button.textContent?.includes('Confirmar asistencia'))!
      .click();

    await vi.waitFor(() => expect(host.textContent).toContain('no aceptó la acción'));
    expect(host.textContent).toContain('no free places left');
    expect(api.activityDetail).toHaveBeenCalledTimes(2);
  });
});
