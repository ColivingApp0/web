import { Component, computed, inject, linkedSignal, resource, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormField as SignalFormField, FormRoot, form } from '@angular/forms/signals';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { toApiError } from '../../../core/http/api-error';
import { UiAlert } from '../../../shared/ui/alert';
import { UiButton } from '../../../shared/ui/button';
import { UiFormField } from '../../../shared/ui/form-field';
import { ListingsApi } from '../data-access/listings-api';
import {
  Currency,
  ListingSort,
  NIGHTS_PER_REFERENCE_MONTH,
  SearchFilters,
  nightlyCapFromMonthlyBudget,
} from '../models/listings-models';
import { FavoritesStore } from '../state/favorites-store';
import { ListingCard } from '../ui/listing-card';

interface FiltersModel {
  minPrice: string;
  maxPrice: string;
  availableFrom: string;
  availableTo: string;
  minNights: string;
  sort: ListingSort | '';
  currency: Currency | '';
}

const SORT_OPTIONS: readonly { value: ListingSort; label: string }[] = [
  { value: 'RECENT', label: 'Más recientes' },
  { value: 'PRICE_ASC', label: 'Precio: de menor a mayor' },
  { value: 'PRICE_DESC', label: 'Precio: de mayor a menor' },
];

function digits(value: string): number | null {
  const cleaned = value.replace(/[^0-9]/g, '');
  return cleaned === '' ? null : Number(cleaned);
}

/**
 * Búsqueda de alojamientos (RF-030/032). Los filtros viven en la URL (se pueden
 * compartir y el «atrás» funciona) y los resultados se cargan con `resource()`
 * contra `GET /api/v1/search/listings`.
 *
 * Presupuesto de la portada: `presupuesto` viaja **mensual** (intención del
 * producto) y aquí se traduce al tope **por noche** que el contrato sí entiende
 * (`maxPrice`); un `maxPrice` explícito en la URL manda sobre esa conversión.
 * La equivalencia se muestra al usuario para que vea el filtro realmente aplicado.
 */
@Component({
  selector: 'app-search-page',
  imports: [
    CurrencyPipe,
    UiAlert,
    UiButton,
    UiFormField,
    SignalFormField,
    FormRoot,
    RouterLink,
    ListingCard,
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
  protected readonly referenceMonthNights = NIGHTS_PER_REFERENCE_MONTH;
  private readonly queryParams = toSignal(this.route.queryParamMap, { requireSync: true });

  /** Presupuesto mensual recibido de la portada (sin conversión). */
  private readonly monthlyBudget = computed(() =>
    digits(this.queryParams().get('presupuesto') ?? ''),
  );

  protected readonly appliedFilters = computed<SearchFilters>(() => {
    const raw = this.queryParams();
    const filters: SearchFilters = {};
    const minPrice = digits(raw.get('minPrice') ?? '');
    const explicitMax = digits(raw.get('maxPrice') ?? '');
    const monthly = this.monthlyBudget();
    // `maxPrice` explícito manda; si no, se deriva del presupuesto mensual.
    const maxPrice =
      explicitMax ?? (monthly === null ? null : nightlyCapFromMonthlyBudget(monthly));
    if (minPrice !== null) filters.minPrice = minPrice;
    if (maxPrice !== null) filters.maxPrice = maxPrice;
    const currency = raw.get('currency');
    if (currency === 'COP' || currency === 'USD') {
      filters.currency = currency;
    } else if (explicitMax === null && monthly !== null) {
      // Los precios del piloto están en COP: comparar un presupuesto contra
      // precios de otra moneda no tendría sentido (`SearchListingsService`).
      filters.currency = 'COP';
    }
    const from = raw.get('availableFrom');
    const to = raw.get('availableTo');
    if (from) filters.availableFrom = from;
    if (to) filters.availableTo = to;
    const sort = raw.get('sort');
    if (sort === 'PRICE_ASC' || sort === 'PRICE_DESC' || sort === 'RECENT') filters.sort = sort;
    const minNights = digits(raw.get('minNights') ?? '');
    if (minNights !== null) filters.minNights = minNights;
    return filters;
  });

  /**
   * Presupuesto mensual efectivamente aplicado, con su tope por noche, para
   * mostrarlo junto a los resultados (transparencia del filtro real).
   */
  protected readonly appliedMonthlyBudget = computed<{
    monthly: number;
    nightly: number;
  } | null>(() => {
    const explicitMax = digits(this.queryParams().get('maxPrice') ?? '');
    const monthly = this.monthlyBudget();
    if (explicitMax !== null || monthly === null) return null;
    return { monthly, nightly: nightlyCapFromMonthlyBudget(monthly) };
  });

  /** Parámetros del buscador de la portada que aún no se pueden aplicar (sin catálogo público). */
  protected readonly hasUnmappableFilters = computed(() => {
    const raw = this.queryParams();
    return raw.has('ciudad') || raw.has('universidad');
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

  private readonly model = linkedSignal<FiltersModel>(() => {
    const filters = this.appliedFilters();
    const raw = this.queryParams();
    return {
      minPrice: filters.minPrice != null ? String(filters.minPrice) : '',
      maxPrice: filters.maxPrice != null ? String(filters.maxPrice) : '',
      availableFrom: raw.get('availableFrom') ?? '',
      availableTo: raw.get('availableTo') ?? '',
      minNights: filters.minNights != null ? String(filters.minNights) : '',
      sort: filters.sort ?? '',
      currency: filters.currency ?? '',
    };
  });

  protected readonly formError = signal<string | null>(null);

  protected readonly filterForm = form(this.model, {
    submission: {
      action: async () => {
        this.apply();
        return undefined;
      },
    },
  });

  private apply(): void {
    const model = this.model();
    const from = model.availableFrom;
    const to = model.availableTo;
    if ((from !== '') !== (to !== '')) {
      this.formError.set('Indica ambas fechas (desde y hasta) o ninguna.');
      return;
    }
    if (from !== '' && to !== '' && to <= from) {
      this.formError.set('La fecha «hasta» debe ser posterior a «desde».');
      return;
    }
    this.formError.set(null);
    const queryParams: Record<string, string> = {};
    const minPrice = digits(model.minPrice);
    const maxPrice = digits(model.maxPrice);
    const minNights = digits(model.minNights);
    if (minPrice !== null) queryParams['minPrice'] = String(minPrice);
    if (maxPrice !== null) queryParams['maxPrice'] = String(maxPrice);
    if (from !== '') queryParams['availableFrom'] = from;
    if (to !== '') queryParams['availableTo'] = to;
    if (minNights !== null) queryParams['minNights'] = String(minNights);
    if (model.sort !== '') queryParams['sort'] = model.sort;
    if (model.currency !== '') queryParams['currency'] = model.currency;
    void this.router.navigate([], { queryParams, relativeTo: this.route });
  }

  protected clearFilters(): void {
    this.formError.set(null);
    void this.router.navigate([], { queryParams: {}, relativeTo: this.route });
  }

  protected retry(): void {
    this.searchResource.reload();
  }
}
