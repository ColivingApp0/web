import {
  Component,
  ElementRef,
  Injector,
  PLATFORM_ID,
  afterNextRender,
  computed,
  effect,
  inject,
  output,
  resource,
  signal,
  viewChild,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import {
  FormField as SignalFormField,
  FormRoot,
  form,
  required,
  validate,
} from '@angular/forms/signals';
import { toApiError } from '../../../core/http/api-error';
import { UiAlert } from '../../../shared/ui/alert';
import { UiButton } from '../../../shared/ui/button';
import { firstFieldError } from '../../../shared/ui/field-errors';
import { UiFormField } from '../../../shared/ui/form-field';
import { UiIcon } from '../../../shared/ui/icon';
import { DirectoryApi } from '../../directory/data-access/directory-api';
import {
  DirectoryCity,
  canonicalCityName,
  searchCities,
} from '../../directory/models/directory-models';
import { HostApi } from '../data-access/host-api';
import { HostProperty } from '../models/host-models';
import { HostAmenityPicker } from './amenity-picker';
import {
  PROPERTY_WIZARD_STEPS,
  PropertyFormModel,
  normalizeAmenities,
  persistProperty,
  propertyFormModel,
} from './property-form-model';

const MAX_CITY_SUGGESTIONS = 8;

/** Clave del borrador local del alta; se borra al crear la propiedad o descartarlo. */
export const PROPERTY_DRAFT_STORAGE_KEY = 'colivinapp.property-draft.v1';

function hasDraftContent(model: PropertyFormModel): boolean {
  return (
    model.title.trim() !== '' ||
    model.description.trim() !== '' ||
    model.cityName.trim() !== '' ||
    model.neighborhood.trim() !== '' ||
    model.address.trim() !== '' ||
    model.amenities.length > 0
  );
}

function isPropertyDraft(value: unknown): value is PropertyFormModel {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record['title'] === 'string' &&
    typeof record['description'] === 'string' &&
    typeof record['cityName'] === 'string' &&
    typeof record['neighborhood'] === 'string' &&
    typeof record['address'] === 'string' &&
    Array.isArray(record['amenities'])
  );
}

/**
 * Alta de una propiedad en cuatro pasos: datos básicos, ubicación, servicios y
 * revisión. La edición de una propiedad existente se hace en una sola página
 * (`HostPropertyForm`) para no obligar a recorrer el asistente.
 */
@Component({
  selector: 'app-host-property-wizard',
  imports: [FormRoot, HostAmenityPicker, SignalFormField, UiAlert, UiButton, UiFormField, UiIcon],
  templateUrl: './property-wizard.html',
})
export class HostPropertyWizard {
  readonly saved = output<HostProperty>();

  private readonly api = inject(HostApi);
  private readonly directory = inject(DirectoryApi);
  private readonly injector = inject(Injector);
  private readonly platformId = inject(PLATFORM_ID);

  protected readonly steps = PROPERTY_WIZARD_STEPS;
  protected readonly step = signal(0);
  protected readonly submitting = signal(false);
  protected readonly serverError = signal<string | null>(null);
  protected readonly serverFieldErrors = signal<Record<string, string>>({});
  protected readonly restoredDraft = signal(false);

  constructor() {
    const draft = this.readDraft();
    if (draft) {
      this.model.set(draft.model);
      this.restoredDraft.set(true);
    }
    effect(
      () => {
        if (!isPlatformBrowser(this.platformId)) return;
        const current = this.model();
        if (hasDraftContent(current)) {
          localStorage.setItem(PROPERTY_DRAFT_STORAGE_KEY, JSON.stringify(current));
        } else {
          localStorage.removeItem(PROPERTY_DRAFT_STORAGE_KEY);
        }
      },
      { injector: this.injector },
    );
  }

  protected readonly currentStep = computed(() => this.steps[this.step()]);
  protected readonly isLastStep = computed(() => this.step() === this.steps.length - 1);
  protected readonly progressLabel = computed(
    () => `Paso ${this.step() + 1} de ${this.steps.length}`,
  );

  protected readonly model = signal<PropertyFormModel>(propertyFormModel(null));

  protected readonly propertyForm = form(
    this.model,
    (path) => {
      required(path.title, { message: 'El nombre de la propiedad es obligatorio.' });
      validate(path.title, ({ value }) =>
        value().trim() === ''
          ? {
              kind: 'blank-title',
              message: 'Escribe un nombre para reconocer la propiedad.',
            }
          : null,
      );
      required(path.cityName, { message: 'La ciudad es obligatoria.' });
      validate(path.cityName, ({ value }) =>
        value().trim() === ''
          ? { kind: 'blank-city', message: 'Indica la ciudad de la propiedad.' }
          : null,
      );
      required(path.neighborhood, { message: 'El barrio o zona es obligatorio.' });
      validate(path.neighborhood, ({ value }) =>
        value().trim() === ''
          ? { kind: 'blank-neighborhood', message: 'Indica el barrio o la zona.' }
          : null,
      );
    },
    {
      submission: {
        action: async () => {
          await this.create();
          return undefined;
        },
      },
    },
  );

  protected readonly titleError = computed(
    () => firstFieldError(this.propertyForm.title) ?? this.serverFieldErrors()['title'] ?? null,
  );
  protected readonly cityError = computed(
    () =>
      firstFieldError(this.propertyForm.cityName) ?? this.serverFieldErrors()['cityName'] ?? null,
  );
  protected readonly neighborhoodError = computed(
    () =>
      firstFieldError(this.propertyForm.neighborhood) ??
      this.serverFieldErrors()['neighborhood'] ??
      null,
  );

  /** La ubicación (ciudad y barrio) es imprescindible para publicar. */
  protected readonly hasLocation = computed(
    () => this.model().cityName.trim() !== '' && this.model().neighborhood.trim() !== '',
  );
  protected readonly canCreate = computed(() => this.titleIsPresent() && this.hasLocation());

  private readonly citiesResource = resource({ loader: () => this.directory.cities() });
  protected readonly citiesUnavailable = computed(() => this.citiesResource.error() !== undefined);

  protected readonly cityQuery = computed(() => this.propertyForm.cityName().value());
  protected readonly cityOpen = signal(false);
  protected readonly activeCityIndex = signal(-1);

  protected readonly cityOptions = computed(() => {
    const query = this.cityQuery().trim();
    if (!this.cityOpen() || query === '') return [];
    const cities = this.citiesResource.hasValue() ? this.citiesResource.value() : [];
    return searchCities(cities, query).slice(0, MAX_CITY_SUGGESTIONS);
  });

  protected readonly activeCityOptionId = computed(() => {
    const city = this.cityOptions()[this.activeCityIndex()];
    return city ? this.cityOptionId(city) : null;
  });

  protected readonly cityHint = computed(() =>
    this.citiesUnavailable()
      ? 'No pudimos cargar el directorio de ciudades. Escribe la ciudad manualmente.'
      : 'Empieza a escribir y elige una sugerencia, o escribe la ciudad manualmente.',
  );

  protected readonly amenities = computed(() => normalizeAmenities(this.model().amenities));

  protected readonly locationSummary = computed(() => {
    const model = this.model();
    const parts = [model.cityName, model.neighborhood, model.address]
      .map((part) => part.trim())
      .filter((part) => part !== '');
    return parts.length > 0 ? parts.join(' · ') : null;
  });

  private readonly announcement = signal('');
  protected readonly liveMessage = this.announcement.asReadonly();
  private readonly stepHeading = viewChild<ElementRef<HTMLElement>>('stepHeading');

  protected stepClasses(index: number): string {
    const base = 'flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold transition';
    if (index === this.step()) {
      return `${base} border-brand-600 bg-brand-50 text-brand-800`;
    }
    return index < this.step() && this.isStepComplete(index)
      ? `${base} border-brand-200 bg-surface text-brand-700`
      : `${base} border-line bg-soft text-muted`;
  }

  /** Un paso solo se marca como completado cuando sus datos obligatorios existen. */
  protected isStepComplete(index: number): boolean {
    if (index === 0) return this.titleIsPresent();
    if (index === 1) return this.hasLocation();
    return index < this.step();
  }

  protected stepStateLabel(index: number): string {
    if (index === this.step()) return 'paso actual';
    return index < this.step() && this.isStepComplete(index) ? 'completado' : 'pendiente';
  }

  protected cityLabel(city: DirectoryCity): string {
    return canonicalCityName(city.name);
  }

  protected onTitleInput(): void {
    this.announcement.set('');
  }

  protected setAmenities(amenities: string[]): void {
    this.model.update((model) => ({ ...model, amenities }));
  }

  protected next(): void {
    if (this.step() === 0 && !this.titleIsPresent()) {
      this.propertyForm.title().markAsTouched();
      this.announce('Escribe el nombre de la propiedad para continuar.');
      this.propertyForm.title().focusBoundControl();
      return;
    }
    if (this.step() === 1 && !this.validateLocation()) return;
    this.goToStep(this.step() + 1);
  }

  protected back(): void {
    if (this.step() === 0) return;
    this.goToStep(this.step() - 1);
  }

  protected editStep(index: number): void {
    this.goToStep(index);
  }

  protected onCityFocus(): void {
    if (this.cityQuery().trim() !== '') {
      this.cityOpen.set(true);
    }
  }

  protected onCityInput(): void {
    this.activeCityIndex.set(-1);
    this.cityOpen.set(true);
  }

  protected onCityBlur(): void {
    this.cityOpen.set(false);
    this.activeCityIndex.set(-1);
  }

  protected onCityKeydown(event: KeyboardEvent): void {
    switch (event.key) {
      case 'ArrowDown': {
        event.preventDefault();
        this.cityOpen.set(true);
        const last = this.cityOptions().length - 1;
        if (last < 0) return;
        this.activeCityIndex.set(Math.min(this.activeCityIndex() + 1, last));
        return;
      }
      case 'ArrowUp': {
        event.preventDefault();
        const last = this.cityOptions().length - 1;
        if (last < 0) return;
        this.activeCityIndex.set(Math.max(this.activeCityIndex() - 1, 0));
        return;
      }
      case 'Enter': {
        if (!this.cityOpen()) return;
        const city = this.cityOptions()[Math.max(this.activeCityIndex(), 0)];
        if (!city) return;
        event.preventDefault();
        this.selectCity(city, event);
        return;
      }
      case 'Escape': {
        if (this.cityOpen()) {
          event.preventDefault();
          this.cityOpen.set(false);
          this.activeCityIndex.set(-1);
        }
        return;
      }
      case 'Tab': {
        this.cityOpen.set(false);
        return;
      }
    }
  }

  protected selectCity(city: DirectoryCity, event?: Event): void {
    event?.preventDefault();
    const cityName = this.cityLabel(city);
    this.propertyForm.cityName().value.set(cityName);
    this.cityOpen.set(false);
    this.activeCityIndex.set(-1);
    this.announce(`${cityName} seleccionada.`);
  }

  protected cityOptionId(city: DirectoryCity): string {
    return `host-property-city-option-${city.id}`;
  }

  /** Valida la ubicación en el paso 2 y lleva el foco al primer campo vacío. */
  private validateLocation(): boolean {
    const model = this.model();
    const cityMissing = model.cityName.trim() === '';
    const neighborhoodMissing = model.neighborhood.trim() === '';
    if (cityMissing) {
      this.propertyForm.cityName().markAsTouched();
      this.announce('Indica la ciudad para continuar.');
      this.propertyForm.cityName().focusBoundControl();
      return false;
    }
    if (neighborhoodMissing) {
      this.propertyForm.neighborhood().markAsTouched();
      this.announce('Indica el barrio o la zona para continuar.');
      this.propertyForm.neighborhood().focusBoundControl();
      return false;
    }
    return true;
  }

  private titleIsPresent(): boolean {
    return this.model().title.trim() !== '';
  }

  /** ¿Hay datos escritos que se perderían al cerrar el alta? */
  hasDraft(): boolean {
    return hasDraftContent(this.model());
  }

  /** Descarta el borrador y deja el asistente listo para un alta nueva. */
  discardDraft(): void {
    this.model.set(propertyFormModel(null));
    this.step.set(0);
    this.restoredDraft.set(false);
    this.serverError.set(null);
    this.serverFieldErrors.set({});
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem(PROPERTY_DRAFT_STORAGE_KEY);
    }
  }

  private readDraft(): { model: PropertyFormModel } | null {
    if (!isPlatformBrowser(this.platformId)) return null;
    const raw = localStorage.getItem(PROPERTY_DRAFT_STORAGE_KEY);
    if (!raw) return null;
    try {
      const parsed: unknown = JSON.parse(raw);
      if (!isPropertyDraft(parsed)) return null;
      return { model: parsed };
    } catch {
      localStorage.removeItem(PROPERTY_DRAFT_STORAGE_KEY);
      return null;
    }
  }

  private goToStep(index: number): void {
    const next = Math.min(Math.max(index, 0), this.steps.length - 1);
    this.step.set(next);
    this.announce(`Paso ${next + 1} de ${this.steps.length}: ${this.steps[next].title}.`);
    afterNextRender(() => this.stepHeading()?.nativeElement.focus(), {
      injector: this.injector,
    });
  }

  private announce(message: string): void {
    this.announcement.set(message);
  }

  private async create(): Promise<void> {
    if (!this.isLastStep() || this.submitting()) return;
    if (!this.titleIsPresent()) {
      this.propertyForm.title().markAsTouched();
      this.goToStep(0);
      this.announce('Escribe el nombre de la propiedad para continuar.');
      this.propertyForm.title().focusBoundControl();
      return;
    }
    if (!this.hasLocation()) {
      this.goToStep(1);
      this.announce('Completa la ciudad y el barrio antes de crear la propiedad.');
      this.propertyForm.cityName().markAsTouched();
      this.propertyForm.neighborhood().markAsTouched();
      return;
    }

    this.submitting.set(true);
    this.serverError.set(null);
    this.serverFieldErrors.set({});
    try {
      const saved = await persistProperty(this.api, this.model(), null);
      if (isPlatformBrowser(this.platformId)) {
        localStorage.removeItem(PROPERTY_DRAFT_STORAGE_KEY);
      }
      this.saved.emit(saved);
    } catch (error) {
      const apiError = toApiError(error);
      this.serverFieldErrors.set(apiError.fieldErrors);
      this.serverError.set(apiError.message);
    } finally {
      this.submitting.set(false);
    }
  }
}
