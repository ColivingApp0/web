import { Component, computed, input } from '@angular/core';

export type ButtonVariant = 'primary' | 'secondary';

const BASE_CLASSES =
  'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700 ' +
  'disabled:cursor-not-allowed disabled:opacity-60';

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: 'bg-brand-700 text-white hover:bg-brand-600',
  secondary: 'border border-line bg-white text-brand-700 hover:bg-soft',
};

/** Botón reutilizable de la app (carga, variantes). El click burbujea al host. */
@Component({
  selector: 'ui-button',
  template: `
    <button [type]="type()" [disabled]="disabled() || loading()" [class]="classes()">
      @if (loading()) {
        <span
          class="size-4 animate-spin rounded-full border-2 border-current border-t-transparent"
          aria-hidden="true"
        ></span>
      }
      <ng-content />
    </button>
  `,
})
export class UiButton {
  readonly variant = input<ButtonVariant>('primary');
  readonly type = input<'button' | 'submit'>('submit');
  readonly loading = input(false);
  readonly disabled = input(false);
  readonly full = input(false);

  protected readonly classes = computed(
    () => `${BASE_CLASSES} ${VARIANT_CLASSES[this.variant()]}${this.full() ? ' w-full' : ''}`,
  );
}
