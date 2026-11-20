import { canonicalCityName } from '../../directory/models/directory-models';
import { SearchFilters } from './listings-models';

/** Lector mínimo de parámetros (compatible con `ParamMap` y `URLSearchParams`). */
export interface QueryParamReader {
  get(name: string): string | null;
}

function digits(value: string | null): number | null {
  if (value === null) return null;
  const cleaned = value.replace(/[^0-9]/g, '');
  return cleaned === '' ? null : Number(cleaned);
}

/**
 * Mapea la URL de `/alojamientos` a los filtros que consume el backend.
 *
 * `ciudad` se traduce a `cityName` (texto, sin distinguir tildes); la ciudad de
 * `universidad` se resuelve aparte contra el directorio. `q` sigue siendo el
 * texto libre y se combina con la ubicación.
 */
export function searchFiltersFromParams(params: QueryParamReader): SearchFilters {
  const filters: SearchFilters = { availableOnly: true };
  const q = params.get('q');
  if (q?.trim()) filters.q = q.trim();
  const city = canonicalCityName(params.get('ciudad') ?? '');
  if (city !== '') filters.cityName = city;
  const minPrice = digits(params.get('minPrice'));
  const maxPrice = digits(params.get('maxPrice')) ?? digits(params.get('presupuesto'));
  if (minPrice !== null) filters.minPrice = minPrice;
  if (maxPrice !== null) filters.maxPrice = maxPrice;
  const currency = params.get('currency');
  if (currency === 'COP' || currency === 'USD') filters.currency = currency;
  const sort = params.get('sort');
  if (sort === 'PRICE_ASC' || sort === 'PRICE_DESC' || sort === 'RECENT') filters.sort = sort;
  const minCapacity = digits(params.get('minCapacity'));
  if (minCapacity !== null) filters.minCapacity = minCapacity;
  if (params.get('availableOnly') === 'false') filters.availableOnly = false;
  if (params.get('airConditioning') === 'true') filters.airConditioning = true;
  if (params.get('fan') === 'true') filters.fan = true;
  const bathroom = params.get('bathroomType');
  if (bathroom === 'PRIVADO' || bathroom === 'COMPARTIDO') filters.bathroomType = bathroom;
  const roomType = params.get('roomType');
  if (roomType === 'INDIVIDUAL' || roomType === 'COMPARTIDA') filters.roomType = roomType;
  return filters;
}
