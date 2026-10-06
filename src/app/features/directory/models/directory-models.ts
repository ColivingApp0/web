/**
 * Contratos del **directorio público de ciudades y universidades** de Colombia,
 * servidos por la API abierta [API-Colombia](https://api-colombia.com) — un
 * tercer servicio público **distinto** del backend de ColivinApp.
 *
 * Se tipa solo lo que la UI consume (respuestas estrechas) y se normaliza a
 * modelos propios (`DirectoryCity`, `DirectoryUniversity`). Este directorio es de
 * **consulta**: sus identificadores son enteros de API-Colombia y **no** son los
 * UUID de los catálogos del backend, así que no se envían como filtro de la
 * búsqueda de alojamientos (limitación documentada en la guía del frontend).
 */

/** Base de API-Colombia (pública, sin autenticación y con CORS `*`). */
export const API_COLOMBIA_BASE = 'https://api-colombia.com/api/v1';

/** Máximo de resultados que el buscador devuelve por consulta (evita listas enormes). */
export const DIRECTORY_RESULT_LIMIT = 40;

/** Ciudad del directorio, normalizada desde `/City` + `/Department`. */
export interface DirectoryCity {
  id: number;
  name: string;
  departmentName: string | null;
  population: number | null;
}

/** Universidad del directorio, normalizada desde `/HigherEducationInstitution`. */
export interface DirectoryUniversity {
  id: number;
  name: string;
  cityName: string | null;
  legalNature: string | null;
  academicCharacter: string | null;
  website: string | null;
  highQualityAccredited: boolean;
}

/** Campo leído de `GET /City` (solo lo que se usa). */
export interface ColombiaCityResponse {
  id: number;
  name: string;
  departmentId: number | null;
  population: number | null;
}

/** Campo leído de `GET /Department` (solo lo que se usa). */
export interface ColombiaDepartmentResponse {
  id: number;
  name: string;
}

/** Campo leído de `GET /HigherEducationInstitution` (solo lo que se usa). */
export interface ColombiaUniversityResponse {
  id: number;
  name: string;
  legalNature: string | null;
  academicCharacter: string | null;
  website: string | null;
  isHighQualityAccredited: boolean | null;
  city: { id: number; name: string } | null;
}

/** Combina ciudades y departamentos en el modelo del directorio. */
export function toDirectoryCities(
  cities: readonly ColombiaCityResponse[],
  departments: readonly ColombiaDepartmentResponse[],
): DirectoryCity[] {
  const departmentNames = new Map(
    departments.map((department) => [department.id, department.name]),
  );
  return cities.map((city) => ({
    id: city.id,
    name: city.name,
    departmentName:
      city.departmentId === null ? null : (departmentNames.get(city.departmentId) ?? null),
    population: city.population,
  }));
}

/** Normaliza las universidades al modelo del directorio. */
export function toDirectoryUniversities(
  universities: readonly ColombiaUniversityResponse[],
): DirectoryUniversity[] {
  return universities.map((university) => ({
    id: university.id,
    name: university.name,
    cityName: university.city?.name ?? null,
    legalNature: university.legalNature,
    academicCharacter: university.academicCharacter,
    website: university.website,
    highQualityAccredited: university.isHighQualityAccredited === true,
  }));
}

/** URL navegable del sitio web de una institución (la API la entrega sin esquema). */
export function externalWebsiteUrl(website: string | null): string | null {
  const trimmed = website?.trim() ?? '';
  if (trimmed === '') return null;
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

/** Quita tildes y mayúsculas para una búsqueda tolerante (`Medellin` ≈ `Medellín`). */
export function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/** Búsqueda de ciudades por nombre o departamento. */
export function searchCities(cities: readonly DirectoryCity[], query: string): DirectoryCity[] {
  return rankedMatches(
    cities,
    query,
    (city) => city.name,
    (city) => city.departmentName,
  );
}

/** Búsqueda de universidades por nombre o ciudad donde tiene sede. */
export function searchUniversities(
  universities: readonly DirectoryUniversity[],
  query: string,
): DirectoryUniversity[] {
  return rankedMatches(
    universities,
    query,
    (university) => university.name,
    (university) => university.cityName,
  );
}

/** Etiqueta legible de una ciudad con su departamento, si se conoce. */
export function cityLabel(city: DirectoryCity): string {
  return city.departmentName ? `${city.name} · ${city.departmentName}` : city.name;
}

/**
 * Filtra por coincidencia (nombre principal o lugar), prioriza las entradas que
 * **empiezan** por el término y ordena alfabéticamente. Con consulta vacía no
 * devuelve nada (la UI invita a escribir) y acota a `DIRECTORY_RESULT_LIMIT`.
 */
function rankedMatches<T>(
  items: readonly T[],
  query: string,
  nameOf: (item: T) => string,
  placeOf: (item: T) => string | null,
): T[] {
  const term = normalizeText(query);
  if (term === '') return [];
  const matched = items.filter(
    (item) =>
      normalizeText(nameOf(item)).includes(term) ||
      normalizeText(placeOf(item) ?? '').includes(term),
  );
  matched.sort((left, right) => {
    const leftName = normalizeText(nameOf(left));
    const rightName = normalizeText(nameOf(right));
    const leftStarts = leftName.startsWith(term) ? 0 : 1;
    const rightStarts = rightName.startsWith(term) ? 0 : 1;
    if (leftStarts !== rightStarts) return leftStarts - rightStarts;
    return leftName.localeCompare(rightName, 'es');
  });
  return matched.slice(0, DIRECTORY_RESULT_LIMIT);
}
