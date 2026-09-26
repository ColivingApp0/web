/**
 * Contratos del descubrimiento público (contextos search + accommodation).
 * Reflejan los DTOs reales; los campos `*Code` son UUID de catálogos que aún
 * no tienen endpoint público (limitación documentada: no se muestran en UI).
 */

export type ListingSort = 'PRICE_ASC' | 'PRICE_DESC' | 'RECENT';

export type Currency = 'COP' | 'USD';

export type PublicationStatus =
  'BORRADOR' | 'EN_REVISION' | 'PUBLICADA' | 'PAUSADA' | 'OCULTA' | 'ARCHIVADA';

export type AvailabilityState = 'DISPONIBLE' | 'BLOQUEADO' | 'OCUPADO';

export type CancellationPolicy = 'FLEXIBLE' | 'MODERADA' | 'ESTRICTA';

/** Filtros de `GET /api/v1/search/listings` (todos opcionales y combinables). */
export interface SearchFilters {
  minPrice?: number;
  maxPrice?: number;
  currency?: Currency;
  availableFrom?: string;
  availableTo?: string;
  sort?: ListingSort;
  minNights?: number;
}

/**
 * Presupuesto **mensual** → tope **por noche**.
 *
 * El contrato real de búsqueda no tiene concepto de presupuesto mensual:
 * `maxPrice` se compara contra `pricePerNight` (`SearchListingsService`, RF-030).
 * El buscador de la portada expresa la intención del producto («máximo mensual»,
 * que es como razona un estudiante), así que la conversión vive aquí, en una
 * única función pura y documentada, y la UI muestra **ambas** cifras para no
 * comunicar un filtro distinto del que realmente se aplica.
 *
 * No se inventa ningún parámetro nuevo: se sigue enviando `maxPrice`.
 */
export const NIGHTS_PER_REFERENCE_MONTH = 30;

/** Tope por noche equivalente a un presupuesto mensual (redondeo hacia abajo). */
export function nightlyCapFromMonthlyBudget(monthlyBudget: number): number {
  return Math.floor(monthlyBudget / NIGHTS_PER_REFERENCE_MONTH);
}

/** Respuesta de `GET /api/v1/search/listings` (ListingView). */
export interface ListingView {
  publicationId: string;
  unitId: string;
  title: string;
  cityId: string | null;
  pricePerNight: number | null;
  currency: Currency | null;
  serviceCodes: string[];
  roomTypeCode: string | null;
  accessibilityCodes: string[];
  minNights: number | null;
}

export interface PropertyView {
  id: string;
  hostId: string;
  title: string | null;
  description: string | null;
  cityId: string | null;
  address: string | null;
  amenities: string[];
  archived: boolean;
}

export interface UnitView {
  id: string;
  propertyId: string;
  name: string;
  maxGuests: number;
  bedrooms: number;
  beds: number;
  bathrooms: number;
  typeCode: string | null;
  accessibilityCodes: string[];
}

export interface PublicationSummary {
  id: string;
  unitId: string;
  title: string;
  status: PublicationStatus;
  services: string[];
  applicableRuleCodes: string[];
}

export interface PricingView {
  publicationId: string;
  basePricePerNight: number;
  currency: Currency;
}

export interface RulesView {
  publicationId: string;
  cancellationPolicy: CancellationPolicy;
  checkInTime: string;
  checkOutTime: string;
  minNights: number;
  maxNights: number;
  houseRules: string[];
}

/** Respuesta de `GET /api/v1/publications/{id}` (PublicationDetailView). */
export interface PublicationDetailView {
  publication: PublicationSummary;
  property: PropertyView;
  unit: UnitView;
  pricing: PricingView | null;
  rules: RulesView | null;
}

/** Respuesta de `GET /api/v1/publications/{id}/availability` (día a día, [from, to)). */
export interface DayAvailabilityView {
  date: string;
  state: AvailabilityState;
  reserved: boolean;
}

/** Respuesta de `/api/v1/favorites` (FavoriteView). */
export interface FavoriteView {
  id: string;
  publicationId: string;
  createdAt: string;
}
