import { Component, computed, inject, linkedSignal, resource, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormField as SignalFormField, FormRoot, form } from '@angular/forms/signals';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { toApiError } from '../../../core/http/api-error';
import { UiAlert } from '../../../shared/ui/alert';
import { UiButton } from '../../../shared/ui/button';
import { UiEmptyState } from '../../../shared/ui/empty-state';
import { UiFormField } from '../../../shared/ui/form-field';
import { UiIcon } from '../../../shared/ui/icon';
import { DirectoryApi } from '../../directory/data-access/directory-api';
import {
  DirectoryCity,
  DirectoryUniversity,
  normalizeText,
} from '../../directory/models/directory-models';
import { ListingsApi } from '../data-access/listings-api';
import {
  BathroomType,
  Currency,
  ListingSort,
  MONTHLY_PRICE_MAX,
  MONTHLY_PRICE_MIN,
  MONTHLY_PRICE_STEP,
  RoomType,
  SearchFilters,
} from '../models/listings-models';
import {
  LocationFilter,
  locationQueryParams,
  locationResultsLabel,
  parseLocationParams,
  resolveCityLocation,
  resolveUniversityLocation,
} from '../models/location-filter';
import { searchFiltersFromParams } from '../models/search-params';
import { roomsFoundLabel, roomsLabel } from '../../../shared/utils/plural';
import { FavoritesStore } from '../state/favorites-store';
import { ListingCard } from '../ui/listing-card';
import { LocationPicker } from '../ui/location-picker';
import { MonthlyPriceSlider } from '../ui/monthly-price-slider';

interface FiltersModel {
  q: string;
  location: LocationFilter | null;
  minPrice: number;
  maxPrice: number;
  minCapacity: string;
  currency: Currency | '';
  bathroomType: BathroomType | '';
  roomType: RoomType | '';
  airConditioning: boolean;
  fan: boolean;
  availableOnly: boolean;
  sort: ListingSort | '';
}

const SORT_OPTIONS: readonly { value: ListingSort; label: string }[] = [
  { value: 'PRICE_ASC', label: 'Precio mensual: menor a mayor' },
  { value: 'PRICE_DESC', label: 'Precio mensual: mayor a menor' },
];

function digits(value: string | null): number | null {
  if (value === null) return null;
  const cleaned = value.replace(/[^0-9]/g, '');
  return cleaned === '' ? null : Number(cleaned);
}

function clampMonthlyPrice(value: number): number {
  const snapped = Math.round(value / MONTHLY_PRICE_STEP) * MONTHLY_PRICE_STEP;
  return Math.min(MONTHLY_PRICE_MAX, Math.max(MONTHLY_PRICE_MIN, snapped));
}

/**
 * Exploración de habitaciones con filtros mensuales y de características.
 * Los filtros viven en la URL (compartibles, «atrás» funciona) y se aplican en
 * el backend; no hay calendario ni selección de fechas.
 */
@Component({
  selector: 'app-search-page',
  imports: [
    RouterLink,
    UiAlert,
    UiButton,
    UiEmptyState,
    UiFormField,
    UiIcon,
    SignalFormField,
    FormRoot,
    ListingCard,
    LocationPicker,
    MonthlyPriceSlider,
  ],
  templateUrl: './search-page.html',
})
export class SearchPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(ListingsApi);
  private readonly directory = inject(DirectoryApi);
  protected readonly favorites = inject(FavoritesStore);

  constructor() {
    void this.favorites.load();
  }

  protected readonly sortOptions = SORT_OPTIONS;
  protected readonly roomsCount = roomsLabel;
  protected readonly roomsFound = roomsFoundLabel;
  private readonly queryParams = toSignal(this.route.queryParamMap, { requireSync: true });

  /** Ubicación tal como viene en la URL, antes de resolverla contra el directorio. */
  protected readonly urlLocation = computed(() => {
    const raw = this.queryParams();
    return parseLocationParams(raw.get('ciudad'), raw.get('universidad'));
  });

  private readonly citiesResource = resource({
    params: () => this.urlLocation()?.kind === 'city',
    loader: ({ params }) =>
      params ? this.directory.cities() : Promise.resolve<DirectoryCity[]>([]),
  });
  private readonly universitiesResource = resource({
    params: () => this.urlLocation()?.kind === 'university',
    loader: ({ params }) =>
      params ? this.directory.universities() : Promise.resolve<DirectoryUniversity[]>([]),
  });

  /** Ubicación de la URL completada con departamento/ciudad del directorio. */
  protected readonly resolvedUrlLocation = computed<LocationFilter | null>(() => {
    const location = this.urlLocation();
    if (!location) return null;
    return location.kind === 'city'
      ? resolveCityLocation(location, this.citiesResource.value() ?? [])
      : resolveUniversityLocation(location, this.universitiesResource.value() ?? []);
  });

  /** Filtros que dependen solo de la URL (sin resolver la universidad). */
  private readonly urlFilters = computed<SearchFilters>(() =>
    searchFiltersFromParams(this.queryParams()),
  );

  /** Ciudad efectiva: directa para una ciudad; resuelta para una universidad. */
  private readonly activeCityName = computed<string | null>(() => {
    const location = this.urlLocation();
    if (!location) return null;
    return location.kind === 'city'
      ? location.cityName
      : (this.resolvedUrlLocation()?.cityName ?? null);
  });

  protected readonly appliedFilters = computed<SearchFilters>(() => {
    const filters = { ...this.urlFilters() };
    const cityName = this.activeCityName();
    if (cityName) filters.cityName = cityName;
    return filters;
  });

  /** Aviso cuando una universidad de la URL no se puede traducir a una ciudad. */
  protected readonly locationNotice = computed(() => {
    const location = this.urlLocation();
    if (!location || location.kind !== 'university') return null;
    if (this.universitiesResource.isLoading()) return null;
    if (this.universitiesResource.error()) return null;
    if (this.resolvedUrlLocation()?.cityName) return null;
    const known = (this.universitiesResource.value() ?? []).some(
      (university) => normalizeText(university.name) === normalizeText(location.name),
    );
    return known
      ? `No tenemos la ciudad de «${location.name}»; elige una ciudad u otra universidad.`
      : `No encontramos «${location.name}» en el directorio; elige otra ubicación.`;
  });

  protected readonly searchParams = computed<SearchFilters | undefined>(() => {
    const location = this.urlLocation();
    if (location?.kind === 'university') {
      const status = this.universitiesResource.status();
      // Espera a resolver la ciudad de la universidad para no buscar sin filtro.
      if (status === 'idle' || status === 'loading') return undefined;
    }
    return this.appliedFilters();
  });

  protected readonly searchResource = resource({
    params: () => this.searchParams(),
    loader: ({ params }) => this.api.list(params),
  });

  protected readonly listings = computed(() => this.searchResource.value() ?? []);
  protected readonly loading = computed(
    () => this.searchResource.isLoading() || this.searchParams() === undefined,
  );
  protected readonly errorMessage = computed(() => {
    const error = this.searchResource.error();
    return error ? toApiError(error).message : null;
  });
  protected readonly activeFilterCount = computed(() => {
    const filters = this.appliedFilters();
    return [
      filters.q,
      filters.cityName,
      filters.minPrice,
      filters.maxPrice,
      filters.minCapacity,
      filters.currency,
      filters.bathroomType,
      filters.roomType,
      filters.airConditioning,
      filters.fan,
      filters.availableOnly === false ? 'full' : null,
    ].filter((value) => value !== undefined && value !== null).length;
  });

  protected readonly model = linkedSignal<FiltersModel>(() => {
    const filters = this.urlFilters();
    return {
      q: filters.q ?? '',
      location: this.urlLocation(),
      minPrice: clampMonthlyPrice(filters.minPrice ?? MONTHLY_PRICE_MIN),
      maxPrice: clampMonthlyPrice(filters.maxPrice ?? MONTHLY_PRICE_MAX),
      minCapacity: filters.minCapacity != null ? String(filters.minCapacity) : '',
      currency: filters.currency ?? '',
      bathroomType: filters.bathroomType ?? '',
      roomType: filters.roomType ?? '',
      airConditioning: filters.airConditioning ?? false,
      fan: filters.fan ?? false,
      availableOnly: filters.availableOnly !== false,
      sort: filters.sort ?? '',
    };
  });

  protected readonly formError = signal<string | null>(null);
  protected readonly filterOpen = signal(false);

  /** Ubicación del formulario, completada con el directorio cuando aplica. */
  protected readonly selectedLocation = computed<LocationFilter | null>(() => {
    const selected = this.model().location;
    if (!selected) return null;
    const resolved = this.resolvedUrlLocation();
    if (
      resolved &&
      resolved.kind === selected.kind &&
      normalizeText(resolved.name) === normalizeText(selected.name)
    ) {
      return resolved;
    }
    return selected;
  });

  protected readonly resultsSummary = computed(() => {
    const location = this.resolvedUrlLocation();
    const count = this.listings().length;
    return location ? locationResultsLabel(count, location) : this.roomsFound(count);
  });

  protected readonly filterForm = form(this.model, {
    submission: {
      action: async () => {
        this.apply();
        return undefined;
      },
    },
  });

  protected apply(): void {
    const model = this.model();
    const capacity = digits(model.minCapacity);
    if (model.minCapacity.trim() !== '' && (capacity === null || capacity < 1)) {
      this.formError.set('La capacidad mínima debe ser un número entero mayor que cero.');
      return;
    }
    this.formError.set(null);
    const queryParams: Record<string, string> = {};
    if (model.q.trim()) queryParams['q'] = model.q.trim();
    if (model.minPrice > MONTHLY_PRICE_MIN) queryParams['minPrice'] = String(model.minPrice);
    if (model.maxPrice < MONTHLY_PRICE_MAX) queryParams['maxPrice'] = String(model.maxPrice);
    if (capacity !== null) queryParams['minCapacity'] = String(capacity);
    if (model.currency !== '') queryParams['currency'] = model.currency;
    if (model.bathroomType !== '') queryParams['bathroomType'] = model.bathroomType;
    if (model.roomType !== '') queryParams['roomType'] = model.roomType;
    if (model.airConditioning) queryParams['airConditioning'] = 'true';
    if (model.fan) queryParams['fan'] = 'true';
    if (!model.availableOnly) queryParams['availableOnly'] = 'false';
    if (model.sort !== '') queryParams['sort'] = model.sort;
    Object.assign(queryParams, locationQueryParams(model.location));
    void this.router.navigate([], { queryParams, relativeTo: this.route });
  }

  protected setLocation(location: LocationFilter | null): void {
    this.model.update((current) => ({ ...current, location }));
  }

  protected setPriceMin(value: number): void {
    this.model.update((current) => ({ ...current, minPrice: value }));
  }

  protected setPriceMax(value: number): void {
    this.model.update((current) => ({ ...current, maxPrice: value }));
  }

  protected clearFilters(): void {
    this.formError.set(null);
    void this.router.navigate([], { queryParams: {}, relativeTo: this.route });
  }

  protected retry(): void {
    this.searchResource.reload();
  }

  protected toggleFilters(): void {
    this.filterOpen.update((open) => !open);
  }
}
