import { isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID, Service, computed, inject, signal } from '@angular/core';
import { PropertyFormModel } from '../ui/property-form-model';

/** Clave histórica del borrador local del alta. */
export const PROPERTY_DRAFT_STORAGE_KEY = 'colivinapp.property-draft.v1';

export interface PropertyDraft {
  model: PropertyFormModel;
  step: number;
  savedAt: string;
}

interface StoredDraft extends PropertyDraft {
  version: 3;
}

interface LegacyStoredDraft extends PropertyDraft {
  version: 2;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === 'string');
}

function isFormModelRecord(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record['title'] === 'string' &&
    typeof record['description'] === 'string' &&
    typeof record['cityName'] === 'string' &&
    typeof record['neighborhood'] === 'string' &&
    typeof record['address'] === 'string' &&
    isStringArray(record['amenities'])
  );
}

function isPropertyFormModel(value: unknown): value is PropertyFormModel {
  return isFormModelRecord(value) && isStringArray(value['photoUrls']);
}

function isStoredDraft(value: unknown): value is StoredDraft {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    record['version'] === 3 &&
    isPropertyFormModel(record['model']) &&
    typeof record['step'] === 'number' &&
    Number.isInteger(record['step']) &&
    record['step'] >= 0 &&
    typeof record['savedAt'] === 'string'
  );
}

function isLegacyStoredDraft(value: unknown): value is LegacyStoredDraft {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    record['version'] === 2 &&
    isFormModelRecord(record['model']) &&
    typeof record['step'] === 'number' &&
    Number.isInteger(record['step']) &&
    record['step'] >= 0 &&
    typeof record['savedAt'] === 'string'
  );
}

/**
 * Borrador local del alta de propiedad.
 *
 * Se guarda en `localStorage` en cada cambio del formulario para que sobreviva a
 * cerrar el asistente o recargar. El panel lo muestra como una tarjeta
 * recuperable con fecha y acción «Continuar»; descartarlo lo elimina de verdad.
 * No sustituye al backend: la propiedad solo existe cuando se crea de verdad.
 */
@Service()
export class PropertyDraftStore {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly state = signal<PropertyDraft | null>(null);

  readonly draft = this.state.asReadonly();
  readonly hasDraft = computed(() => this.state() !== null);

  constructor() {
    this.state.set(this.read());
  }

  save(model: PropertyFormModel, step: number): void {
    const draft: PropertyDraft = {
      model: {
        ...model,
        amenities: [...model.amenities],
        photoUrls: [...model.photoUrls],
      },
      step,
      savedAt: new Date().toISOString(),
    };
    this.state.set(draft);
    this.persist({ ...draft, version: 3 });
  }

  clear(): void {
    this.state.set(null);
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem(PROPERTY_DRAFT_STORAGE_KEY);
    }
  }

  private read(): PropertyDraft | null {
    if (!isPlatformBrowser(this.platformId)) return null;
    const raw = localStorage.getItem(PROPERTY_DRAFT_STORAGE_KEY);
    if (!raw) return null;
    try {
      const parsed: unknown = JSON.parse(raw);
      if (isStoredDraft(parsed)) {
        return { model: parsed.model, step: parsed.step, savedAt: parsed.savedAt };
      }
      // Compatibilidad con borradores anteriores a las fotos en el alta.
      if (isLegacyStoredDraft(parsed)) {
        return {
          model: { ...(parsed.model as PropertyFormModel), photoUrls: [] },
          step: parsed.step,
          savedAt: parsed.savedAt,
        };
      }
      // Compatibilidad con el borrador plano de la primera versión.
      if (isFormModelRecord(parsed)) {
        return {
          model: { ...(parsed as unknown as PropertyFormModel), photoUrls: [] },
          step: 0,
          savedAt: new Date().toISOString(),
        };
      }
      localStorage.removeItem(PROPERTY_DRAFT_STORAGE_KEY);
      return null;
    } catch {
      localStorage.removeItem(PROPERTY_DRAFT_STORAGE_KEY);
      return null;
    }
  }

  private persist(draft: StoredDraft): void {
    if (!isPlatformBrowser(this.platformId)) return;
    localStorage.setItem(PROPERTY_DRAFT_STORAGE_KEY, JSON.stringify(draft));
  }
}
