import { Component, computed, input, output, signal } from '@angular/core';
import { UiButton } from '../../../shared/ui/button';
import { UiIcon } from '../../../shared/ui/icon';
import { pluralize } from '../../../shared/utils/plural';
import { HostPhoto } from '../models/host-models';

/**
 * Gestor de fotografías (propiedad o habitación). Presentacional: la página
 * decide el endpoint y recarga el recurso tras cada cambio.
 */
@Component({
  selector: 'app-host-photo-manager',
  imports: [UiButton, UiIcon],
  template: `
    <div class="space-y-4">
      <div class="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 class="font-display text-lg font-extrabold text-ink">{{ title() }}</h3>
          <p class="mt-1 text-sm text-muted">{{ hint() }}</p>
        </div>
        <span class="ui-chip">{{ photosLabel() }}</span>
      </div>

      @if (photos().length > 0) {
        <ul class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          @for (photo of photos(); track photo.id; let index = $index) {
            <li class="group relative overflow-hidden rounded-xl border border-line bg-soft">
              <img
                [src]="photo.url"
                [alt]="'Fotografía ' + (index + 1)"
                class="aspect-[4/3] w-full object-cover"
              />
              <div
                class="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-black/55 p-1.5"
              >
                <div class="flex gap-1">
                  <button
                    type="button"
                    class="grid size-7 place-items-center rounded-md bg-white/95 text-ink disabled:opacity-40"
                    [disabled]="index === 0 || busy()"
                    [attr.aria-label]="'Mover fotografía ' + (index + 1) + ' antes'"
                    (click)="move(index, -1)"
                  >
                    <ui-icon name="arrow-left" size="xs" />
                  </button>
                  <button
                    type="button"
                    class="grid size-7 place-items-center rounded-md bg-white/95 text-ink disabled:opacity-40"
                    [disabled]="index === photos().length - 1 || busy()"
                    [attr.aria-label]="'Mover fotografía ' + (index + 1) + ' después'"
                    (click)="move(index, 1)"
                  >
                    <ui-icon name="arrow-right" size="xs" />
                  </button>
                </div>
                <button
                  type="button"
                  class="grid size-7 place-items-center rounded-md bg-white/95 text-danger-700"
                  [disabled]="busy()"
                  [attr.aria-label]="'Eliminar fotografía ' + (index + 1)"
                  (click)="remove.emit(photo.id)"
                >
                  <ui-icon name="trash" size="xs" />
                </button>
              </div>
            </li>
          }
        </ul>
      } @else {
        <p
          class="rounded-xl border border-dashed border-line bg-soft px-4 py-6 text-center text-sm text-muted"
        >
          Aún no hay fotografías. Añade una URL de imagen para que la habitación se vea en
          búsquedas.
        </p>
      }

      <div class="flex flex-col gap-2 sm:flex-row sm:items-end">
        <div class="min-w-0 flex-1">
          <label for="photo-url" class="ui-label">URL de la fotografía</label>
          <input
            id="photo-url"
            type="url"
            class="ui-input"
            placeholder="/images/rooms/room-01.jpg o https://…"
            [value]="url()"
            (input)="updateUrl($event)"
            [disabled]="busy()"
          />
        </div>
        <ui-button
          type="button"
          [loading]="busy()"
          [disabled]="url().trim() === ''"
          [ariaLabel]="'Añadir fotografía'"
          (click)="addPhotoNow()"
        >
          <ui-icon name="plus" size="sm" /> Añadir foto
        </ui-button>
      </div>
      @if (error(); as message) {
        <p class="text-xs font-semibold text-danger-700">{{ message }}</p>
      }
    </div>
  `,
})
export class HostPhotoManager {
  readonly title = input('Fotografías');
  readonly hint = input('La primera foto será la portada. Puedes reordenarlas o eliminarlas.');
  readonly photos = input<readonly HostPhoto[]>([]);
  readonly busy = input(false);
  readonly error = input<string | null>(null);

  readonly add = output<string>();
  readonly remove = output<string>();
  readonly reorder = output<string[]>();

  protected readonly url = signal('');
  protected readonly photosLabel = computed(() => pluralize(this.photos().length, 'foto', 'fotos'));

  protected updateUrl(event: Event): void {
    if (event.target instanceof HTMLInputElement) this.url.set(event.target.value);
  }

  protected addPhotoNow(): void {
    const value = this.url().trim();
    if (value === '') return;
    this.add.emit(value);
    this.url.set('');
  }

  protected move(index: number, delta: number): void {
    const target = index + delta;
    const items = [...this.photos()];
    if (target < 0 || target >= items.length) return;
    [items[index], items[target]] = [items[target], items[index]];
    this.reorder.emit(items.map((photo) => photo.id));
  }
}
