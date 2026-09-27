/**
 * Contratos del área de anfitrión (`/api/v1/host/**`), reflejando los DTOs reales
 * de `accommodation`. Decisión de límites: esta feature define sus propios tipos
 * (aunque se parezcan a los públicos de `listings`) para no acoplarse a otra feature.
 */

export type HostPublicationStatus =
  'BORRADOR' | 'EN_REVISION' | 'PUBLICADA' | 'PAUSADA' | 'OCULTA' | 'ARCHIVADA';

export type HostCurrency = 'COP' | 'USD';

export type HostCancellationPolicy = 'FLEXIBLE' | 'MODERADA' | 'ESTRICTA';

export type HostAvailabilityState = 'DISPONIBLE' | 'BLOQUEADO' | 'OCUPADO';

export type HostPublicationAction = 'publish' | 'pause' | 'hide' | 'request-review' | 'archive';

export interface HostProperty {
  id: string;
  hostId: string;
  title: string | null;
  description: string | null;
  cityId: string | null;
  address: string | null;
  amenities: string[];
  archived: boolean;
}

export interface HostUnit {
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

export interface HostPublication {
  id: string;
  unitId: string;
  title: string;
  status: HostPublicationStatus;
  services: string[];
  applicableRuleCodes: string[];
}

export interface HostPricing {
  publicationId: string;
  basePricePerNight: number;
  currency: HostCurrency;
}

export interface HostRules {
  publicationId: string;
  cancellationPolicy: HostCancellationPolicy;
  checkInTime: string;
  checkOutTime: string;
  minNights: number;
  maxNights: number;
  houseRules: string[];
}

export interface HostDayAvailability {
  date: string;
  state: HostAvailabilityState;
  reserved: boolean;
}

export interface CreatePropertyPayload {
  title: string;
  description: string | null;
  address: string | null;
  amenities: string[];
}

/** `PATCH /host/properties/{id}` conserva campos `null`, pero reemplaza `amenities` → envío completo. */
export interface UpdatePropertyPayload extends CreatePropertyPayload {
  cityId: string | null;
}

export interface CreateUnitPayload {
  name: string;
  maxGuests: number;
  bedrooms: number;
  beds: number;
  bathrooms: number;
}

/** `PATCH /host/units/{id}` sobrescribe los campos; `typeCode`/`accessibilityCodes` null conservan. */
export type UpdateUnitPayload = CreateUnitPayload;

export interface PricingPayload {
  basePricePerNight: number;
  currency: HostCurrency;
}

export interface RulesPayload {
  cancellationPolicy: HostCancellationPolicy;
  checkInTime: string;
  checkOutTime: string;
  minNights: number;
  maxNights: number;
  houseRules: string[];
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
  BORRADOR: 'bg-soft text-muted',
  EN_REVISION: 'bg-accent-500/15 text-accent-600',
  PUBLICADA: 'bg-brand-700/10 text-brand-800',
  PAUSADA: 'bg-accent-500/15 text-accent-600',
  OCULTA: 'bg-[#eef0f5] text-[#5a6478]',
  ARCHIVADA: 'bg-red-100 text-red-800',
};

export interface PublicationActionOption {
  action: HostPublicationAction;
  label: string;
  danger?: boolean;
}

/**
 * Transiciones del dominio real (`Publication`): publish desde BORRADOR/PAUSADA/OCULTA;
 * pause desde PUBLICADA; hide desde PUBLICADA/PAUSADA; request-review desde
 * BORRADOR/PUBLICADA/PAUSADA; archive sin restricción (la UI no ofrece acciones
 * mientras está EN_REVISION para no interferir con moderación).
 */
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
