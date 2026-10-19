/**
 * Contratos del área de anfitrión (`/api/v1/host/**`) para renta mensual:
 * propiedades → habitaciones, fotos propias, precio mensual y disponibilidad
 * comercial (publicar/pausar). Sin reglas nocturnas ni calendarios.
 */

export type HostPublicationStatus =
  'BORRADOR' | 'EN_REVISION' | 'PUBLICADA' | 'PAUSADA' | 'OCULTA' | 'ARCHIVADA';

export type HostCurrency = 'COP' | 'USD';
export type HostPriceUnit = 'POR_HABITACION' | 'POR_PERSONA';
export type HostRoomType = 'INDIVIDUAL' | 'COMPARTIDA';
export type HostBathroomType = 'PRIVADO' | 'COMPARTIDO';

export type HostPublicationAction = 'publish' | 'pause' | 'hide' | 'request-review' | 'archive';

export interface HostPhoto {
  id: string;
  url: string;
  position: number;
}

export interface HostProperty {
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
  photos: HostPhoto[];
}

export interface HostPublication {
  id: string;
  unitId: string;
  title: string;
  status: HostPublicationStatus;
  services: string[];
  applicableRuleCodes: string[];
}

export interface HostUnit {
  id: string;
  propertyId: string;
  name: string;
  description: string | null;
  maxGuests: number;
  monthlyPrice: number | null;
  currency: HostCurrency;
  priceUnit: HostPriceUnit;
  roomType: HostRoomType;
  bathroomType: HostBathroomType;
  airConditioning: boolean;
  fan: boolean;
  commonAreas: string[];
  typeCode: string | null;
  accessibilityCodes: string[];
  sortOrder: number;
  photos: HostPhoto[];
  publication: HostPublication | null;
  occupiedPlaces: number;
  availablePlaces: number;
  published: boolean;
  effectiveAvailable: boolean;
  availabilityLabel: string;
}

export interface HostPropertyDetail {
  property: HostProperty;
  host: { userId: string; name: string | null; avatarUrl: string | null } | null;
  rooms: HostUnit[];
}

export interface CreatePropertyPayload {
  title: string;
  description: string | null;
  cityId: string | null;
  cityName: string | null;
  neighborhood: string | null;
  address: string | null;
  amenities: string[];
}

export type UpdatePropertyPayload = CreatePropertyPayload;

export interface CreateUnitPayload {
  name: string;
  description: string | null;
  maxGuests: number;
  monthlyPrice: number | null;
  currency: HostCurrency;
  priceUnit: HostPriceUnit;
  roomType: HostRoomType;
  bathroomType: HostBathroomType;
  airConditioning: boolean;
  fan: boolean;
  commonAreas: string[];
  sortOrder?: number;
}

export type UpdateUnitPayload = CreateUnitPayload;

export interface PricingPayload {
  monthlyPrice: number;
  currency: HostCurrency;
  priceUnit: HostPriceUnit;
}

export const PUBLICATION_STATUS_LABELS: Record<HostPublicationStatus, string> = {
  BORRADOR: 'Borrador',
  EN_REVISION: 'En revisión',
  PUBLICADA: 'Publicada',
  PAUSADA: 'Pausada',
  OCULTA: 'Oculta',
  ARCHIVADA: 'Archivada',
};

export const PUBLICATION_STATUS_CLASSES: Record<HostPublicationStatus, string> = {
  BORRADOR: 'bg-soft text-muted border-line',
  EN_REVISION: 'bg-sky-soft text-[#0c4a6e] border-[#bae6fd]',
  PUBLICADA: 'bg-brand-50 text-brand-800 border-brand-200',
  PAUSADA: 'bg-soft text-ink-soft border-line',
  OCULTA: 'bg-soft text-muted border-line',
  ARCHIVADA: 'bg-danger-50 text-danger-700 border-danger-100',
};

export interface PublicationActionOption {
  action: HostPublicationAction;
  label: string;
  danger?: boolean;
}

/** Transiciones reales de `Publication`; solo se muestran las válidas. */
export function publicationActions(
  status: HostPublicationStatus,
): readonly PublicationActionOption[] {
  switch (status) {
    case 'BORRADOR':
      return [
        { action: 'publish', label: 'Publicar' },
        { action: 'request-review', label: 'Enviar a revisión' },
        { action: 'archive', label: 'Archivar', danger: true },
      ];
    case 'PUBLICADA':
      return [
        { action: 'pause', label: 'Pausar' },
        { action: 'hide', label: 'Ocultar' },
        { action: 'request-review', label: 'Enviar a revisión' },
        { action: 'archive', label: 'Archivar', danger: true },
      ];
    case 'PAUSADA':
      return [
        { action: 'publish', label: 'Publicar' },
        { action: 'hide', label: 'Ocultar' },
        { action: 'request-review', label: 'Enviar a revisión' },
        { action: 'archive', label: 'Archivar', danger: true },
      ];
    case 'OCULTA':
      return [
        { action: 'publish', label: 'Publicar' },
        { action: 'archive', label: 'Archivar', danger: true },
      ];
    case 'EN_REVISION':
    case 'ARCHIVADA':
      return [];
  }
}

export function hostPriceUnitLabel(unit: HostPriceUnit): string {
  return unit === 'POR_PERSONA' ? 'por persona' : 'por habitación';
}
