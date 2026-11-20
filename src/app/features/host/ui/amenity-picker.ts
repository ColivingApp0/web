import { Component, computed, input, output, signal } from '@angular/core';
import { UiButton } from '../../../shared/ui/button';
import { UiFormField } from '../../../shared/ui/form-field';
import { UiIcon } from '../../../shared/ui/icon';
import {
  PROPERTY_AMENITY_SUGGESTIONS,
  amenityKey,
  normalizeAmenities,
  toggleAmenity,
} from './property-form-model';

/**
 * Selector de servicios y zonas comunes: chips sugeridos + servicios propios.
 * Emite una lista normalizada (sin vacíos ni duplicados) para guardar `string[]`.
 */
@Component({
  selector: 'app-host-amenity-picker',
  imports: [UiButton, UiFormField, UiIcon],
  templateUrl: './amenity-picker.html',
})
export class HostAmenityPicker {
  readonly value = input.required<readonly string[]>();
  readonly suggestions = input<readonly string[]>(PROPERTY_AMENITY_SUGGESTIONS);
  readonly changed = output<string[]>();

  protected readonly custom = signal('');
  protected readonly customError = signal<string | null>(null);

  protected readonly selected = computed(() => normalizeAmenities(this.value()));

  private readonly selectedKeys = computed(
    () => new Set(this.selected().map((amenity) => amenityKey(amenity))),
  );

  /** Servicios sugeridos que aún no están seleccionados. */
  protected readonly available = computed(() =>
    this.suggestions().filter((suggestion) => !this.selectedKeys().has(amenityKey(suggestion))),
  );

  protected readonly countLabel = computed(() => {
    const count = this.selected().length;
    return count === 1 ? '1 servicio seleccionado' : `${count} servicios seleccionados`;
  });

  protected classes(selected: boolean): string {
    return selected
      ? 'inline-flex min-h-9 items-center gap-1.5 rounded-pill border border-brand-600 bg-brand-50 px-3 text-xs font-bold text-brand-800 transition hover:bg-brand-100'
      : 'inline-flex min-h-9 items-center gap-1.5 rounded-pill border border-line bg-surface px-3 text-xs font-semibold text-ink-soft transition hover:border-brand-300 hover:bg-brand-50';
  }

  protected toggle(amenity: string): void {
    this.changed.emit(toggleAmenity(this.selected(), amenity));
  }

  protected remove(amenity: string): void {
    this.toggle(amenity);
  }

  protected onCustomInput(event: Event): void {
    const target = event.target;
    if (target instanceof HTMLInputElement) {
      this.custom.set(target.value);
      this.customError.set(null);
    }
  }

  protected addCustom(event?: Event): void {
    event?.preventDefault();
    const amenity = this.custom().trim();
    if (amenity === '') {
      this.customError.set('Escribe el nombre del servicio que quieres añadir.');
      return;
    }
    if (amenity.length > 60) {
      this.customError.set('Usa un nombre de 60 caracteres o menos.');
      return;
    }
    if (this.selectedKeys().has(amenityKey(amenity))) {
      this.customError.set('Ese servicio ya está en la lista.');
      return;
    }
    this.changed.emit(toggleAmenity(this.selected(), amenity));
    this.custom.set('');
    this.customError.set(null);
  }
}
