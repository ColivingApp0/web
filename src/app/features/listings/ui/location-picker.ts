import { Component, computed, inject, input, output, resource, signal } from '@angular/core';
import { toApiError } from '../../../core/http/api-error';
import { UiAlert } from '../../../shared/ui/alert';
import { UiButton } from '../../../shared/ui/button';
import { UiIcon } from '../../../shared/ui/icon';
import { DirectoryApi } from '../../directory/data-access/directory-api';
import {
  DIRECTORY_RESULT_LIMIT,
  DirectoryCity,
  DirectoryUniversity,
  canonicalCityName,
  normalizeText,
  searchCities,
  searchUniversities,
} from '../../directory/models/directory-models';
import {
  LocationFilter,
  LocationKind,
  cityLocation,
  locationChipLabel,
  universityLocation,
} from '../models/location-filter';

interface LocationOption {
  key: string;
  name: string;
  detail: string | null;
  location: LocationFilter;
}

let pickerSequence = 0;

/**
 * Selector de ubicación para la búsqueda: ciudad o universidad (cuya sede se
 * traduce a `cityName`). Los datos salen del directorio público API-Colombia,
 * memoizado en `DirectoryApi`; la búsqueda local tolera tildes y mayúsculas.
 */
@Component({
  selector: 'app-location-picker',
  imports: [UiAlert, UiButton, UiIcon],
  templateUrl: './location-picker.html',
})
export class LocationPicker {
  private readonly directory = inject(DirectoryApi);
  private readonly sequence = pickerSequence++;
  protected readonly inputId = `location-input-${this.sequence}`;
  protected readonly listboxId = `location-listbox-${this.sequence}`;
  protected readonly helpId = `location-help-${this.sequence}`;

  readonly location = input<LocationFilter | null>(null);
  readonly locationChange = output<LocationFilter | null>();

  protected readonly mode = signal<LocationKind>('city');
  protected readonly query = signal('');
  protected readonly open = signal(false);
  protected readonly activeIndex = signal(-1);
  protected readonly locationWarning = signal<string | null>(null);

  protected readonly resultLimit = DIRECTORY_RESULT_LIMIT;

  private readonly citiesResource = resource({
    params: () => this.mode() === 'city',
    loader: ({ params }) =>
      params ? this.directory.cities() : Promise.resolve<DirectoryCity[]>([]),
  });
  private readonly universitiesResource = resource({
    params: () => this.mode() === 'university',
    loader: ({ params }) =>
      params ? this.directory.universities() : Promise.resolve<DirectoryUniversity[]>([]),
  });

  protected readonly options = computed<LocationOption[]>(() => {
    if (this.query().trim() === '') return [];
    if (this.mode() === 'city') {
      return searchCities(this.citiesResource.value() ?? [], this.query()).map((city) => ({
        key: `city-${city.id}`,
        name: city.name,
        detail: city.departmentName,
        location: cityLocation(city),
      }));
    }
    return searchUniversities(this.universitiesResource.value() ?? [], this.query()).map(
      (university) => ({
        key: `university-${university.id}`,
        name: university.name,
        detail: university.cityName ?? 'Ciudad no disponible',
        location: universityLocation(university),
      }),
    );
  });

  protected readonly searching = computed(() => this.query().trim().length > 0);
  protected readonly expanded = computed(() => this.open() && this.searching());
  protected readonly loading = computed(() =>
    this.mode() === 'city'
      ? this.citiesResource.isLoading()
      : this.universitiesResource.isLoading(),
  );
  protected readonly loadError = computed(() => {
    const error =
      this.mode() === 'city' ? this.citiesResource.error() : this.universitiesResource.error();
    return error ? toApiError(error).message : null;
  });
  protected readonly activeOptionId = computed(() => {
    const index = this.activeIndex();
    return this.expanded() && index >= 0 ? this.optionId(index) : null;
  });
  protected readonly chipLabel = computed(() => {
    const selected = this.location();
    return selected ? locationChipLabel(selected) : null;
  });

  protected onInput(event: Event): void {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;
    this.query.set(target.value);
    this.open.set(target.value.trim().length > 0);
    this.activeIndex.set(-1);
    this.locationWarning.set(null);
  }

  protected onFocus(): void {
    if (this.searching()) this.open.set(true);
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.open.set(false);
      this.activeIndex.set(-1);
      return;
    }
    if (!this.expanded()) return;
    const count = this.options().length;
    if (count === 0) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.activeIndex.update((index) => (index + 1) % count);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.activeIndex.update((index) => (index <= 0 ? count - 1 : index - 1));
    } else if (event.key === 'Enter') {
      const index = this.activeIndex();
      if (index >= 0 && index < count) {
        event.preventDefault();
        this.selectAt(index);
      }
    }
  }

  protected setMode(mode: LocationKind): void {
    if (this.mode() === mode) return;
    this.mode.set(mode);
    this.query.set('');
    this.open.set(false);
    this.activeIndex.set(-1);
    this.locationWarning.set(null);
  }

  /** ¿Hay texto escrito pendiente de convertir en filtro al pulsar «Aplicar»? */
  hasPendingQuery(): boolean {
    return this.query().trim() !== '';
  }

  /**
   * Convierte el texto escrito en una ubicación al aplicar los filtros.
   * Acepta coincidencia exacta (incluida «Bogotá D.C.» → «Bogotá») o una única
   * sugerencia. Si hay ambigüedad no filtra: pide elegir una sugerencia.
   */
  resolveTypedLocation(): LocationFilter | null {
    const raw = this.query().trim();
    if (raw === '') return this.location();
    if (this.loading()) {
      this.locationWarning.set(
        'Estamos cargando el directorio. Espera un momento y vuelve a aplicar.',
      );
      return null;
    }
    const options = this.options();
    const query =
      this.mode() === 'city' ? normalizeText(canonicalCityName(raw)) : normalizeText(raw);
    const exact = options.find((option) =>
      this.mode() === 'city'
        ? normalizeText(canonicalCityName(option.name)) === query
        : normalizeText(option.name) === query,
    );
    const chosen = exact ?? (options.length === 1 ? options[0] : null);
    if (!chosen) {
      // La ciudad escrita se puede filtrar aunque el directorio no la conozca o
      // no esté disponible: el backend compara por nombre de ciudad. Sólo se
      // pide elegir una sugerencia cuando hay varias coincidencias posibles.
      const fallbackCity = this.mode() === 'city' ? canonicalCityName(raw) : '';
      if (fallbackCity !== '' && options.length <= 1) {
        this.locationWarning.set(null);
        this.query.set('');
        this.open.set(false);
        this.activeIndex.set(-1);
        return { kind: 'city', name: fallbackCity, cityName: fallbackCity, detail: null };
      }
      this.open.set(false);
      this.activeIndex.set(-1);
      this.locationWarning.set(
        options.length === 0
          ? `No encontramos «${raw}» en el directorio. Revisa la escritura o elige una sugerencia.`
          : `Hay varias coincidencias para «${raw}». Elige una sugerencia para aplicar el filtro.`,
      );
      return null;
    }
    this.locationWarning.set(null);
    this.query.set('');
    this.open.set(false);
    this.activeIndex.set(-1);
    return chosen.location;
  }

  protected selectAt(index: number): void {
    const option = this.options()[index];
    if (!option) return;
    const selected = option.location;
    if (selected.kind === 'university' && !selected.cityName) {
      this.locationWarning.set(
        `No tenemos la ciudad de «${selected.name}». Elige una ciudad o prueba otra universidad.`,
      );
      this.open.set(false);
      this.activeIndex.set(-1);
      return;
    }
    this.locationWarning.set(null);
    this.locationChange.emit(selected);
    this.query.set('');
    this.open.set(false);
    this.activeIndex.set(-1);
  }

  protected clear(): void {
    this.locationWarning.set(null);
    this.locationChange.emit(null);
  }

  protected retry(): void {
    if (this.mode() === 'city') this.citiesResource.reload();
    else this.universitiesResource.reload();
  }

  protected optionId(index: number): string {
    return `${this.listboxId}-option-${index}`;
  }
}
