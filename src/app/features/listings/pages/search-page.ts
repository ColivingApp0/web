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
import { roomsFoundLabel, roomsLabel } from '../../../shared/utils/plural';
import { FavoritesStore } from '../state/favorites-store';
import { ListingCard } from '../ui/listing-card';
import { MonthlyPriceSlider } from '../ui/monthly-price-slider';

interface FiltersModel {
  q: string;
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
    MonthlyPriceSlider,
  ],
  templateUrl: './search-page.html',
})
export class SearchPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(ListingsApi);
  protected readonly favorites = inject(FavoritesStore);

  constructor() {
    void this.favorites.load();
  }

  protected readonly sortOptions = SORT_OPTIONS;
  protected readonly roomsCount = roomsLabel;
  protected readonly roomsFound = roomsFoundLabel;
  private readonly queryParams = toSignal(this.route.queryParamMap, { requireSync: true });

  protected readonly appliedFilters = computed<SearchFilters>(() => {
    const raw = this.queryParams();
    const filters: SearchFilters = { availableOnly: true };
    const q = raw.get('q') ?? raw.get('ciudad') ?? raw.get('universidad');
    if (q?.trim()) filters.q = q.trim();
    const minPrice = digits(raw.get('minPrice'));
    const maxPrice = digits(raw.get('maxPrice')) ?? digits(raw.get('presupuesto'));
    if (minPrice !== null) filters.minPrice = minPrice;
    if (maxPrice !== null) filters.maxPrice = maxPrice;
    const currency = raw.get('currency');
    if (currency === 'COP' || currency === 'USD') filters.currency = currency;
    const sort = raw.get('sort');
    if (sort === 'PRICE_ASC' || sort === 'PRICE_DESC' || sort === 'RECENT') filters.sort = sort;
    const minCapacity = digits(raw.get('minCapacity'));
    if (minCapacity !== null) filters.minCapacity = minCapacity;
    if (raw.get('availableOnly') === 'false') filters.availableOnly = false;
    if (raw.get('airConditioning') === 'true') filters.airConditioning = true;
    if (raw.get('fan') === 'true') filters.fan = true;
    const bathroom = raw.get('bathroomType');
    if (bathroom === 'PRIVADO' || bathroom === 'COMPARTIDO') filters.bathroomType = bathroom;
    const roomType = raw.get('roomType');
    if (roomType === 'INDIVIDUAL' || roomType === 'COMPARTIDA') filters.roomType = roomType;
    return filters;
  });

  protected readonly searchResource = resource({
    params: () => this.appliedFilters(),
    loader: ({ params }) => this.api.list(params),
  });

  protected readonly listings = computed(() => this.searchResource.value() ?? []);
  protected readonly loading = computed(() => this.searchResource.isLoading());
  protected readonly errorMessage = computed(() => {
    const error = this.searchResource.error();
    return error ? toApiError(error).message : null;
  });
  protected readonly activeFilterCount = computed(() => {
    const filters = this.appliedFilters();
    return [
      filters.q,
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
    const filters = this.appliedFilters();
    return {
      q: filters.q ?? '',
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
    void this.router.navigate([], { queryParams, relativeTo: this.route });
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
