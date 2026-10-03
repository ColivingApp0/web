import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ListingsApi } from '../data-access/listings-api';
import { PublicationDetailView } from '../models/listings-models';
import { FavoritesPage } from './favorites-page';

const detail: PublicationDetailView = {
  publication: {
    id: 'p1',
    unitId: 'u1',
    title: 'Loft centro',
    status: 'PUBLICADA',
    services: [],
    applicableRuleCodes: [],
  },
  property: {
    id: 'prop1',
    hostId: 'h1',
    title: null,
    description: null,
    cityId: null,
    address: null,
    amenities: [],
    archived: false,
  },
  unit: {
    id: 'u1',
    propertyId: 'prop1',
    name: 'Loft',
    maxGuests: 2,
    bedrooms: 1,
    beds: 1,
    bathrooms: 1,
    typeCode: null,
    accessibilityCodes: [],
  },
  pricing: { publicationId: 'p1', basePricePerNight: 850000, currency: 'COP' },
  rules: null,
};

function setup(favorites: { publicationId: string; createdAt: string }[]) {
  const api = {
    list: vi.fn(),
    detail: vi.fn((publicationId: string) =>
      publicationId === 'p1'
        ? Promise.resolve(detail)
        : Promise.reject(
            new HttpErrorResponse({ status: 404, error: { code: 'NOT_FOUND', message: 'gone' } }),
          ),
    ),
    availability: vi.fn(),
    listFavorites: vi
      .fn()
      .mockResolvedValue(favorites.map((favorite, index) => ({ id: `f${index}`, ...favorite }))),
    addFavorite: vi.fn(),
    removeFavorite: vi.fn().mockResolvedValue(undefined),
  };
  TestBed.configureTestingModule({
    imports: [FavoritesPage],
    providers: [provideRouter([]), { provide: ListingsApi, useValue: api }],
  });
  return { api };
}

describe('FavoritesPage', () => {
  it('should render saved favorites with the current state of each publication', async () => {
    setup([
      { publicationId: 'p1', createdAt: '2026-10-01T10:00:00Z' },
      { publicationId: 'p2', createdAt: '2026-10-02T10:00:00Z' },
    ]);
    const fixture = TestBed.createComponent(FavoritesPage);
    await fixture.whenStable();

    await vi.waitFor(() =>
      expect((fixture.nativeElement as HTMLElement).textContent).toContain('Loft centro'),
    );
    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'Alojamiento no disponible',
    );
  });

  it('should show the empty state when there are no favorites', async () => {
    setup([]);
    const fixture = TestBed.createComponent(FavoritesPage);
    await fixture.whenStable();

    await vi.waitFor(() =>
      expect((fixture.nativeElement as HTMLElement).textContent).toContain(
        'Aún no tienes favoritos guardados',
      ),
    );
  });

  it('should remove a favorite from the list', async () => {
    const { api } = setup([{ publicationId: 'p1', createdAt: '2026-10-01T10:00:00Z' }]);
    const fixture = TestBed.createComponent(FavoritesPage);
    await fixture.whenStable();
    await vi.waitFor(() =>
      expect((fixture.nativeElement as HTMLElement).textContent).toContain('Loft centro'),
    );

    (fixture.nativeElement as HTMLElement)
      .querySelector<HTMLButtonElement>('ui-button button')!
      .click();
    await vi.waitFor(() => expect(api.removeFavorite).toHaveBeenCalledWith('p1'));
    await vi.waitFor(() =>
      expect((fixture.nativeElement as HTMLElement).textContent).toContain(
        'Aún no tienes favoritos guardados',
      ),
    );
  });
});
