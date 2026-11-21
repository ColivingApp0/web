import { canonicalCityName } from '../../directory/models/directory-models';
import { CreatePropertyPayload, HostProperty } from '../models/host-models';
import { HostApi } from '../data-access/host-api';

/** Estado editable de la información general de una propiedad. */
export interface PropertyFormModel {
  title: string;
  description: string;
  cityId: string | null;
  cityName: string;
  neighborhood: string;
  address: string;
  amenities: string[];
}

/** Servicios y zonas comunes que se ofrecen como atajos en el alta. */
export const PROPERTY_AMENITY_SUGGESTIONS: readonly string[] = [
  'WiFi',
  'Cocina equipada',
  'Lavandería',
  'Terraza',
  'Zona de estudio',
  'Parqueadero',
  'Gimnasio',
  'Baño privado',
  'Sala',
  'Jardín',
];

export interface PropertyWizardStep {
  readonly title: string;
  readonly description: string;
}

/** Pasos del alta; el orden es parte del flujo y se refleja en el indicador. */
export const PROPERTY_WIZARD_STEPS: readonly PropertyWizardStep[] = [
  {
    title: 'Datos básicos',
    description: 'Un nombre claro y una descripción breve ayudan a presentar el inmueble.',
  },
  {
    title: 'Ubicación',
    description: 'Indica dónde está la propiedad para que las personas puedan ubicarla.',
  },
  {
    title: 'Servicios y zonas comunes',
    description: 'Selecciona lo que incluye el inmueble. Podrás ajustarlo más adelante.',
  },
  {
    title: 'Revisión',
    description: 'Comprueba la información antes de crear la propiedad.',
  },
];

/** ¿Hay datos escritos que merezca la pena conservar como borrador? */
export function hasPropertyDraftContent(model: PropertyFormModel): boolean {
  return (
    model.title.trim() !== '' ||
    model.description.trim() !== '' ||
    model.cityName.trim() !== '' ||
    model.neighborhood.trim() !== '' ||
    model.address.trim() !== '' ||
    model.amenities.length > 0
  );
}

/** Modelo inicial para el alta o para editar una propiedad existente. */
export function propertyFormModel(property: HostProperty | null): PropertyFormModel {
  return {
    title: property?.title ?? '',
    description: property?.description ?? '',
    cityId: property?.cityId ?? null,
    cityName: canonicalCityName(property?.cityName ?? ''),
    neighborhood: property?.neighborhood ?? '',
    address: property?.address ?? '',
    amenities: [...(property?.amenities ?? [])],
  };
}

/** Clave tolerante para comparar servicios sin duplicar mayúsculas ni espacios. */
export function amenityKey(amenity: string): string {
  return amenity.trim().toLocaleLowerCase('es');
}

/** Elimina vacíos y duplicados conservando el orden y la escritura original. */
export function normalizeAmenities(values: readonly string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const trimmed = value.trim();
    if (trimmed === '') continue;
    const key = amenityKey(trimmed);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(trimmed);
  }
  return result;
}

/** Añade o quita un servicio de la selección. */
export function toggleAmenity(values: readonly string[], amenity: string): string[] {
  const key = amenityKey(amenity);
  if (key === '') return normalizeAmenities(values);
  const exists = values.some((value) => amenityKey(value) === key);
  return exists
    ? normalizeAmenities(values).filter((value) => amenityKey(value) !== key)
    : normalizeAmenities([...values, amenity]);
}

/** Traduce el modelo de la UI al contrato de creación/edición de propiedad. */
export function buildPropertyPayload(model: PropertyFormModel): CreatePropertyPayload {
  return {
    title: model.title.trim(),
    description: model.description.trim() || null,
    cityId: model.cityId,
    cityName: canonicalCityName(model.cityName) || null,
    neighborhood: model.neighborhood.trim() || null,
    address: model.address.trim() || null,
    amenities: normalizeAmenities(model.amenities),
  };
}

/** Crea o actualiza la propiedad según exista ya; misma lógica para alta y edición. */
export function persistProperty(
  api: HostApi,
  model: PropertyFormModel,
  existing: HostProperty | null,
): Promise<HostProperty> {
  const payload = buildPropertyPayload(model);
  return existing ? api.updateProperty(existing.id, payload) : api.createProperty(payload);
}
