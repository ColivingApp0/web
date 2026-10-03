import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { of } from 'rxjs';
import { AdminApi } from '../data-access/admin-api';
import { AdminPublicationView } from '../models/admin-models';
import { PublicationsPage } from './publications-page';

const IN_REVIEW: AdminPublicationView = {
  id: 'p1',
  unitId: 'u1',
  title: 'Estudio 502 en Torre M3',
  status: 'EN_REVISION',
  services: [],
  applicableRuleCodes: [],
};

const PUBLISHED: AdminPublicationView = {
  ...IN_REVIEW,
  id: 'p2',
  title: 'Apartaestudio luminoso',
  status: 'PUBLICADA',
};

function setup(
  query: Record<string, string> = {},
  publications: AdminPublicationView[] = [IN_REVIEW],
) {
  const api = {
    publicationsQueue: vi.fn().mockResolvedValue(publications),
    reviewPublication: vi.fn().mockResolvedValue({ ...IN_REVIEW, status: 'BORRADOR' }),
  };
  const router = { navigate: vi.fn().mockResolvedValue(true) };
  TestBed.configureTestingModule({
    imports: [PublicationsPage],
    providers: [
      { provide: Router, useValue: router },
      { provide: ActivatedRoute, useValue: { queryParamMap: of(convertToParamMap(query)) } },
      { provide: AdminApi, useValue: api },
    ],
  });
  return { api, router };
}

describe('PublicationsPage', () => {
  it('should load the review queue by default and offer the decision', async () => {
    const { api } = setup();
    const fixture = TestBed.createComponent(PublicationsPage);
    await fixture.whenStable();
    const host = fixture.nativeElement as HTMLElement;

    expect(api.publicationsQueue).toHaveBeenCalledWith(null);
    expect(host.textContent).toContain('Estudio 502 en Torre M3');
    expect(host.textContent).toContain('Revisar');

    Array.from(host.querySelectorAll('button'))
      .find((button) => button.textContent?.includes('Revisar'))!
      .click();
    await fixture.whenStable();

    expect(host.querySelector('#publication-decision')).not.toBeNull();
    expect(host.textContent).toContain('Registrar decisión');
  });

  it('should not offer the decision outside the review queue', async () => {
    setup({ estado: 'PUBLICADA' }, [PUBLISHED]);
    const fixture = TestBed.createComponent(PublicationsPage);
    await fixture.whenStable();
    const host = fixture.nativeElement as HTMLElement;

    expect(host.textContent).toContain('Apartaestudio luminoso');
    expect(host.textContent).toContain('Esta publicación no está en revisión');
    expect(
      Array.from(host.querySelectorAll('button')).some((b) => b.textContent?.includes('Revisar')),
    ).toBe(false);
  });

  it('should require a note for a rejection and send the real body', async () => {
    const { api } = setup();
    const fixture = TestBed.createComponent(PublicationsPage);
    await fixture.whenStable();
    const host = fixture.nativeElement as HTMLElement;

    Array.from(host.querySelectorAll('button'))
      .find((button) => button.textContent?.includes('Revisar'))!
      .click();
    await fixture.whenStable();

    const decision = host.querySelector<HTMLSelectElement>('#publication-decision')!;
    decision.value = 'RECHAZADA';
    decision.dispatchEvent(new Event('change'));
    await fixture.whenStable();

    Array.from(host.querySelectorAll('button'))
      .find((button) => button.textContent?.includes('Registrar decisión'))!
      .click();
    await fixture.whenStable();
    expect(host.textContent).toContain('Falta completar');
    expect(api.reviewPublication).not.toHaveBeenCalled();

    const note = host.querySelector<HTMLTextAreaElement>('#publication-note')!;
    note.value = 'Fotos que no corresponden';
    note.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    Array.from(host.querySelectorAll('button'))
      .find((button) => button.textContent?.includes('Registrar decisión'))!
      .click();

    await vi.waitFor(() =>
      expect(api.reviewPublication).toHaveBeenCalledWith(
        'p1',
        'RECHAZADA',
        'Fotos que no corresponden',
      ),
    );
    await vi.waitFor(() => expect(host.textContent).toContain('Decisión registrada'));
    expect(host.textContent).toContain('Borrador');
  });

  it('should approve without a note and inform the resulting state', async () => {
    const { api } = setup();
    api.reviewPublication.mockResolvedValue({ ...IN_REVIEW, status: 'PUBLICADA' });
    const fixture = TestBed.createComponent(PublicationsPage);
    await fixture.whenStable();
    const host = fixture.nativeElement as HTMLElement;

    Array.from(host.querySelectorAll('button'))
      .find((button) => button.textContent?.includes('Revisar'))!
      .click();
    await fixture.whenStable();
    Array.from(host.querySelectorAll('button'))
      .find((button) => button.textContent?.includes('Registrar decisión'))!
      .click();

    await vi.waitFor(() =>
      expect(api.reviewPublication).toHaveBeenCalledWith('p1', 'APROBADA', null),
    );
    await vi.waitFor(() => expect(host.textContent).toContain('Publicada'));
  });

  it('should explain a real 500 when the state changed before the review', async () => {
    const { api } = setup();
    api.reviewPublication.mockRejectedValue(
      new HttpErrorResponse({
        status: 500,
        error: { error: 'Internal Server Error', message: 'The publication is not under review' },
      }),
    );
    const fixture = TestBed.createComponent(PublicationsPage);
    await fixture.whenStable();
    const host = fixture.nativeElement as HTMLElement;

    Array.from(host.querySelectorAll('button'))
      .find((button) => button.textContent?.includes('Revisar'))!
      .click();
    await fixture.whenStable();
    Array.from(host.querySelectorAll('button'))
      .find((button) => button.textContent?.includes('Registrar decisión'))!
      .click();

    await vi.waitFor(() => expect(host.textContent).toContain('error interno (500)'));
    expect(host.textContent).toContain('is not under review');
  });
});
