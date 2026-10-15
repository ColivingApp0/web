/**
 * Contratos del descubrimiento público (search + accommodation), alineados con
 * el modelo real de **renta mensual de habitaciones**. No hay fechas, noches ni
 * tarifas nocturnas.
 */

export type ListingSort = 'PRICE_ASC' | 'PRICE_DESC' | 'RECENT';
export type Currency = 'COP' | 'USD';
export type PriceUnit = 'POR_HABITACION' | 'POR_PERSONA';
export type RoomType = 'INDIVIDUAL' | 'COMPARTIDA';
export type BathroomType = 'PRIVADO' | 'COMPARTIDO';

export type PublicationStatus =
  'BORRADOR' | 'EN_REVISION' | 'PUBLICADA' | 'PAUSADA' | 'OCULTA' | 'ARCHIVADA';

/** Filtros de `GET /api/v1/search/listings` (todos opcionales y combinables). */
export interface SearchFilters {
  q?: string;
  minPrice?: number;
  maxPrice?: number;
  currency?: Currency;
  sort?: ListingSort;
  minCapacity?: number;
  availableOnly?: boolean;
  airConditioning?: boolean;
  fan?: boolean;
  bathroomType?: BathroomType;
  roomType?: RoomType;
  propertyId?: string;
}

/** Escala del control de precio mensual (COP). Es una afordancia de UI. */
export const MONTHLY_PRICE_MIN = 300_000;
export const MONTHLY_PRICE_MAX = 5_000_000;
export const MONTHLY_PRICE_STEP = 100_000;

export interface PhotoView {
  id: string;
  url: string;
  position: number;
}

/** Respuesta de `GET /api/v1/search/listings` (ListingView). */
export interface ListingView {
  publicationId: string;
  unitId: string;
  propertyId: string;
  roomTitle: string;
  propertyTitle: string;
  description: string | null;
  cityId: string | null;
  cityName: string | null;
  neighborhood: string | null;
  monthlyPrice: number | null;
  currency: Currency | null;
  priceUnit: PriceUnit;
  roomType: RoomType;
  bathroomType: BathroomType;
  airConditioning: boolean;
  fan: boolean;
  capacity: number;
  occupiedPlaces: number;
  availablePlaces: number;
  photoUrl: string | null;
  propertyPhotoUrl: string | null;
  serviceCodes: string[];
  accessibilityCodes: string[];
  available: boolean;
  availabilityLabel: string;
}

export interface PropertyView {
  id: string;
  hostId: string;
  title: string | null;
  description: string | null;
  cityId: string | null;
  cityName: string | null;
  neighborhood: string | null;
  address: string | null;
  amenities: string[];
  archived: boolean;
  photos: PhotoView[];
}

export interface UnitView {
  id: string;
  propertyId: string;
  name: string;
  description: string | null;
  maxGuests: number;
  monthlyPrice: number | null;
  currency: Currency;
  priceUnit: PriceUnit;
  roomType: RoomType;
  bathroomType: BathroomType;
  airConditioning: boolean;
  fan: boolean;
  commonAreas: string[];
  typeCode: string | null;
  accessibilityCodes: string[];
  sortOrder: number;
  photos: PhotoView[];
  publication: PublicationSummary | null;
  occupiedPlaces: number;
  availablePlaces: number;
  published: boolean;
  effectiveAvailable: boolean;
  availabilityLabel: string;
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
  monthlyPrice: number | null;
  currency: Currency;
  priceUnit: PriceUnit;
}

export interface PublicUserView {
  userId: string;
  name: string | null;
  avatarUrl: string | null;
}

export interface OccupancyView {
  capacity: number;
  occupiedPlaces: number;
  availablePlaces: number;
  published: boolean;
  effectiveAvailable: boolean;
  label: string;
}

/** Respuesta de `GET /api/v1/properties/{id}`. */
export interface PropertyDetailView {
  property: PropertyView;
  host: PublicUserView | null;
  rooms: UnitView[];
}

/** Respuesta de `GET /api/v1/publications/{id}` (detalle de una habitación). */
export interface PublicationDetailView {
  publication: PublicationSummary;
  property: PropertyView;
  unit: UnitView;
  host: PublicUserView | null;
  occupancy: OccupancyView;
  propertyPhotos: PhotoView[];
}

/** Respuesta de `GET /api/v1/publications/{id}/roommates` (solo con consentimiento). */
export interface RoommateView {
  userId: string;
  name: string;
  avatarUrl: string | null;
}

/** Respuesta de `/api/v1/favorites` (FavoriteView). */
export interface FavoriteView {
  id: string;
  publicationId: string;
  createdAt: string;
}

export function priceUnitLabel(unit: PriceUnit): string {
  return unit === 'POR_PERSONA' ? 'por persona' : 'por habitación';
}

export function roomTypeLabel(type: RoomType): string {
  return type === 'COMPARTIDA' ? 'Habitación compartida' : 'Habitación individual';
}

export function bathroomLabel(type: BathroomType): string {
  return type === 'PRIVADO' ? 'Baño privado' : 'Baño compartido';
}
