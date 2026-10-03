import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { ListingsApi } from '../data-access/listings-api';
import { DayAvailabilityView, PublicationDetailView } from '../models/listings-models';
import { DetailPage } from './detail-page';

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
    title: 'Edificio Aurora',
    description: 'Loft luminoso cerca del campus.',
    cityId: null,
    address: 'Cra 45 #12-34',
    amenities: ['WiFi', 'Cocina'],
    archived: false,
  },
  unit: {
    id: 'u1',
    propertyId: 'prop1',
    name: 'Loft 301',
    maxGuests: 2,
    bedrooms: 1,
    beds: 2,
    bathrooms: 1,
    typeCode: null,
    accessibilityCodes: [],
  },
  pricing: { publicationId: 'p1', basePricePerNight: 850000, currency: 'COP' },
  rules: {
    publicationId: 'p1',
    cancellationPolicy: 'FLEXIBLE',
    checkInTime: '15:00:00',
    checkOutTime: '11:00:00',
    minNights: 2,
    maxNights: 30,
    houseRules: ['No fiestas'],
  },
};

const days: DayAvailabilityView[] = [
  { date: '2026-10-05', state: 'DISPONIBLE', reserved: false },
  { date: '2026-10-06', state: 'BLOQUEADO', reserved: false },
  { date: '2026-10-07', state: 'OCUPADO', reserved: true },
];

function setup() {
  const api = {
    list: vi.fn(),
    detail: vi.fn().mockResolvedValue(detail),
    availability: vi.fn().mockResolvedValue(days),
    listFavorites: vi.fn().mockResolvedValue([]),
  };
  TestBed.configureTestingModule({
    imports: [DetailPage],
    providers: [
      provideRouter([]),
      // Componente creado directamente en test: se simula la ruta hija `:id`.
      {
        provide: ActivatedRoute,
        useValue: {
          paramMap: of(convertToParamMap({ id: 'p1' })),
          queryParamMap: of(convertToParamMap({})),
        },
      },
      { provide: ListingsApi, useValue: api },
    ],
  });
  return { api };
}

describe('DetailPage', () => {
  it('should render the publication detail from the API', async () => {
    const { api } = setup();
    const fixture = TestBed.createComponent(DetailPage);
    await fixture.whenStable();

    await vi.waitFor(() => expect(api.detail).toHaveBeenCalledWith('p1'));
    await vi.waitFor(() =>
      expect((fixture.nativeElement as HTMLElement).textContent).toContain('Loft centro'),
    );
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Loft luminoso cerca del campus.');
    expect(text).toContain('Cra 45 #12-34');
    expect(text).toContain('Flexible');
    expect(text).toContain('15:00');
    expect(text).toContain('850');
  });

  it('should load day-level availability on demand', async () => {
    const { api } = setup();
    const fixture = TestBed.createComponent(DetailPage);
    await fixture.whenStable();
    const host = fixture.nativeElement as HTMLElement;

    const from = host.querySelector<HTMLInputElement>('#availability-from')!;
    from.value = '2026-10-05';
    from.dispatchEvent(new Event('input'));
    const to = host.querySelector<HTMLInputElement>('#availability-to')!;
    to.value = '2026-10-08';
    to.dispatchEvent(new Event('input'));
    host.querySelector('form')!.dispatchEvent(new Event('submit'));

    await vi.waitFor(() =>
      expect(api.availability).toHaveBeenCalledWith('p1', '2026-10-05', '2026-10-08'),
    );
    await vi.waitFor(() => expect(host.textContent).toContain('Disponible'));
    expect(host.textContent).toContain('No disponible');
    expect(host.textContent).toContain('Ocupado');
  });

  it('should reject an inverted date range before calling the API', async () => {
    const { api } = setup();
    const fixture = TestBed.createComponent(DetailPage);
    await fixture.whenStable();
    const host = fixture.nativeElement as HTMLElement;

    const from = host.querySelector<HTMLInputElement>('#availability-from')!;
    from.value = '2026-10-10';
    from.dispatchEvent(new Event('input'));
    const to = host.querySelector<HTMLInputElement>('#availability-to')!;
    to.value = '2026-10-05';
    to.dispatchEvent(new Event('input'));
    host.querySelector('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();

    expect(host.textContent).toContain('posterior');
    expect(api.availability).not.toHaveBeenCalled();
  });
});
