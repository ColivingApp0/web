import { HttpErrorResponse } from '@angular/common/http';
import { registerLocaleData } from '@angular/common';
import localeEsCo from '@angular/common/locales/es-CO';
import { LOCALE_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { CommunityApi } from '../data-access/community-api';
import { ActivityView } from '../models/community-models';
import { MyActivitiesPage } from './my-activities-page';

registerLocaleData(localeEsCo);

const activity: ActivityView = {
  id: 'a1',
  propertyId: 'prop1',
  hostId: 'host',
  title: 'Asado de bienvenida',
  description: 'En la terraza común',
  scheduledAt: '2030-11-10T18:00:00Z',
  capacity: 4,
  status: 'PROGRAMADA',
  confirmedCount: 1,
  freePlaces: 3,
  createdAt: '2026-11-01T10:00:00Z',
};

function setup(activities: ActivityView[]) {
  const api = { listMyActivities: vi.fn().mockResolvedValue(activities) };
  TestBed.configureTestingModule({
    imports: [MyActivitiesPage],
    providers: [
      provideRouter([]),
      { provide: LOCALE_ID, useValue: 'es-CO' },
      { provide: CommunityApi, useValue: api },
    ],
  });
  return { api };
}

describe('MyActivitiesPage', () => {
  it('should render the activities with their phase and capacity', async () => {
    const { api } = setup([activity]);
    const fixture = TestBed.createComponent(MyActivitiesPage);
    await fixture.whenStable();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(api.listMyActivities).toHaveBeenCalled();
    expect(text).toContain('Asado de bienvenida');
    expect(text).toContain('En la terraza común');
    expect(text).toContain('Admite confirmaciones');
    expect(text).toContain('Programada');
    expect(text).toContain('confirmados 1');
    expect(text).toContain('plazas libres 3');
    expect(text).toContain('Ver actividad y participantes');
  });

  it('should derive a passed phase from the date without any stored state', async () => {
    setup([{ ...activity, scheduledAt: '2020-01-01T10:00:00Z' }]);
    const fixture = TestBed.createComponent(MyActivitiesPage);
    await fixture.whenStable();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('La fecha ya pasó');
  });

  it('should show the empty state that explains who enables the community', async () => {
    setup([]);
    const fixture = TestBed.createComponent(MyActivitiesPage);
    await fixture.whenStable();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'Aún no participas en ninguna actividad.',
    );
  });

  it('should surface a server failure with a retry', async () => {
    const { api } = setup([]);
    api.listMyActivities.mockRejectedValue(
      new HttpErrorResponse({ status: 500, error: { error: 'Internal Server Error' } }),
    );
    const fixture = TestBed.createComponent(MyActivitiesPage);
    await fixture.whenStable();
    const host = fixture.nativeElement as HTMLElement;

    await vi.waitFor(() => expect(host.textContent).toContain('Error inesperado'));
    expect(
      Array.from(host.querySelectorAll('button')).some((b) =>
        b.textContent?.includes('Reintentar'),
      ),
    ).toBe(true);
  });
});
