import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { ListingsApi } from '../data-access/listings-api';
import { ListingView } from '../models/listings-models';
import { SearchPage } from './search-page';

const listing: ListingView = {
  publicationId: 'p1',
  unitId: 'u1',
  title: 'Loft centro',
  cityId: null,
  pricePerNight: 850000,
  currency: 'COP',
  serviceCodes: [],
  roomTypeCode: null,
  accessibilityCodes: [],
  minNights: 2,
};

function setup(results: ListingView[] = [listing]) {
  const api = {
    list: vi.fn().mockResolvedValue(results),
    detail: vi.fn(),
    availability: vi.fn(),
    listFavorites: vi.fn().mockResolvedValue([]),
  };
  TestBed.configureTestingModule({
    imports: [SearchPage],
    providers: [
      provideRouter([{ path: 'alojamientos', component: SearchPage }]),
      { provide: ListingsApi, useValue: api },
    ],
  });
  return { api, router: TestBed.inject(Router) };
}

describe('SearchPage', () => {
  it('should translate the monthly budget of the landing into the nightly cap', async () => {
    const { api, router } = setup();
    await router.navigateByUrl('/alojamientos?presupuesto=900000&sort=PRICE_ASC');
    const fixture = TestBed.createComponent(SearchPage);

    // 900.000 al mes / 30 noches = 30.000 por noche, con moneda explícita COP.
    await vi.waitFor(() =>
      expect(api.list).toHaveBeenCalledWith({
        maxPrice: 30000,
        currency: 'COP',
        sort: 'PRICE_ASC',
      }),
    );
    await fixture.whenStable();
    await vi.waitFor(() =>
      expect(
        (fixture.nativeElement as HTMLElement).querySelectorAll('app-listing-card').length,
      ).toBe(1),
    );
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Presupuesto mensual');
    expect(text).toContain('por noche');
    expect(text).toContain('30 noches');
  });

  it('should let an explicit nightly maxPrice win over the monthly budget', async () => {
    const { api, router } = setup();
    await router.navigateByUrl('/alojamientos?presupuesto=900000&maxPrice=45000');
    TestBed.createComponent(SearchPage);

    await vi.waitFor(() => expect(api.list).toHaveBeenCalledWith({ maxPrice: 45000 }));
  });

  it('should show the empty state when there are no results', async () => {
    setup([]);
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/alojamientos');
    const fixture = TestBed.createComponent(SearchPage);
    await fixture.whenStable();

    await vi.waitFor(() =>
      expect((fixture.nativeElement as HTMLElement).textContent).toContain(
        'No encontramos alojamientos',
      ),
    );
  });

  it('should navigate with the form filters on submit', async () => {
    const { router } = setup();
    await router.navigateByUrl('/alojamientos');
    const fixture = TestBed.createComponent(SearchPage);
    await fixture.whenStable();
    const navigate = vi.spyOn(router, 'navigate');
    const host = fixture.nativeElement as HTMLElement;

    const input = host.querySelector<HTMLInputElement>('#filter-max-price')!;
    input.value = '750000';
    input.dispatchEvent(new Event('input'));
    host.querySelector('form')!.dispatchEvent(new Event('submit'));

    await vi.waitFor(() =>
      expect(navigate).toHaveBeenCalledWith(
        [],
        expect.objectContaining({ queryParams: { maxPrice: '750000' } }),
      ),
    );
  });

  it('should reject a single availability date in the form', async () => {
    const { router } = setup();
    await router.navigateByUrl('/alojamientos');
    const fixture = TestBed.createComponent(SearchPage);
    await fixture.whenStable();
    const host = fixture.nativeElement as HTMLElement;

    const from = host.querySelector<HTMLInputElement>('#filter-from')!;
    from.value = '2026-11-01';
    from.dispatchEvent(new Event('input'));
    host.querySelector('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();

    expect(host.textContent).toContain('Indica ambas fechas');
    expect(router.url).toContain('/alojamientos');
  });

  it('should warn when landing filters cannot be mapped yet', async () => {
    setup();
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/alojamientos?ciudad=Medell%C3%ADn');
    const fixture = TestBed.createComponent(SearchPage);
    await fixture.whenStable();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('catálogo público');
  });
});
