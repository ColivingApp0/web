import {
  DirectoryCity,
  DirectoryUniversity,
  canonicalCityName,
  normalizeText,
} from '../../directory/models/directory-models';

/** Tipo de ubicación elegida en la búsqueda de habitaciones. */
export type LocationKind = 'city' | 'university';

/**
 * Ubicación activa de la búsqueda. `cityName` es el texto que viaja al backend
 * (`cityName`); para una universidad se resuelve a la ciudad de su sede.
 */
export interface LocationFilter {
  kind: LocationKind;
  /** Nombre visible (ciudad o universidad). */
  name: string;
  /** Ciudad usada por `GET /search/listings`; `null` si aún no se conoce. */
  cityName: string | null;
  /** Departamento de la ciudad o ciudad de la universidad, si se conoce. */
  detail: string | null;
}

/** Construye la ubicación a partir de una ciudad del directorio. */
export function cityLocation(city: DirectoryCity): LocationFilter {
  const cityName = canonicalCityName(city.name);
  return {
    kind: 'city',
    name: cityName,
    cityName,
    detail: city.departmentName,
  };
}

/** Construye la ubicación a partir de una universidad del directorio. */
export function universityLocation(university: DirectoryUniversity): LocationFilter {
  const cityName = university.cityName
    ? canonicalCityName(university.cityName)
    : university.cityName;
  return {
    kind: 'university',
    name: university.name,
    cityName,
    detail: cityName,
  };
}

/**
 * Lee la ubicación de la URL. `ciudad` tiene prioridad sobre `universidad` si
 * ambas vienen informadas; los valores vacíos se ignoran. La ciudad se canoniza
 * para que «Bogotá D.C.» y «Bogotá» produzcan la misma búsqueda.
 */
export function parseLocationParams(
  cityName: string | null,
  universityName: string | null,
): LocationFilter | null {
  const city = canonicalCityName(cityName ?? '');
  if (city !== '') {
    return { kind: 'city', name: city, cityName: city, detail: null };
  }
  const university = universityName?.trim() ?? '';
  if (university !== '') {
    return { kind: 'university', name: university, cityName: null, detail: null };
  }
  return null;
}

/** Parámetros de URL que representan la ubicación (uno solo, compartible). */
export function locationQueryParams(location: LocationFilter | null): Record<string, string> {
  if (!location) return {};
  return location.kind === 'city' ? { ciudad: location.name } : { universidad: location.name };
}

/** Completa una ciudad de la URL con su departamento cuando está en el directorio. */
export function resolveCityLocation(
  location: LocationFilter | null,
  cities: readonly DirectoryCity[],
): LocationFilter | null {
  if (!location || location.kind !== 'city') return location;
  const key = normalizeText(canonicalCityName(location.name));
  const match = cities.find((city) => normalizeText(canonicalCityName(city.name)) === key);
  return match ? cityLocation(match) : location;
}

/**
 * Resuelve la ciudad de una universidad de la URL. La comparación ignora tildes
 * y mayúsculas; si no hay coincidencia o la sede no tiene ciudad, conserva la
 * ubicación original (`cityName: null`) para avisar y no filtrar.
 */
export function resolveUniversityLocation(
  location: LocationFilter | null,
  universities: readonly DirectoryUniversity[],
): LocationFilter | null {
  if (!location || location.kind !== 'university') return location;
  const match = universities.find(
    (university) => normalizeText(university.name) === normalizeText(location.name),
  );
  return match ? universityLocation(match) : location;
}

/** Texto del chip de ubicación seleccionada. */
export function locationChipLabel(location: LocationFilter): string {
  if (location.kind === 'city') {
    return location.detail ? `En ${location.name} · ${location.detail}` : `En ${location.name}`;
  }
  return location.detail
    ? `Cerca de ${location.name} · ${location.detail}`
    : `Cerca de ${location.name}`;
}

/** Resumen de resultados con la ubicación aplicada («3 resultados en Medellín»). */
export function locationResultsLabel(count: number, location: LocationFilter): string {
  const noun = count === 1 ? 'resultado' : 'resultados';
  return location.kind === 'city'
    ? `${count} ${noun} en ${location.name}`
    : `${count} ${noun} cerca de ${location.name}`;
}
