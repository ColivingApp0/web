import { Component, computed, input } from '@angular/core';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'accent' | 'link';
export type ButtonSize = 'sm' | 'md' | 'lg';

const BASE_CLASSES =
  'inline-flex items-center justify-center gap-2 font-bold transition duration-200 ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700 ' +
  'disabled:cursor-not-allowed disabled:opacity-55';

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: 'bg-brand-700 text-white shadow-sm hover:bg-brand-600 active:bg-brand-800',
  secondary: 'border border-line bg-white text-ink hover:border-line-strong hover:bg-soft',
  ghost: 'text-brand-700 hover:bg-brand-700/8',
  danger: 'bg-danger-600 text-white hover:bg-danger-700',
  accent: 'bg-accent-500 text-brand-900 hover:bg-accent-400',
  link: 'text-brand-700 underline-offset-4 hover:underline',
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'min-h-9 rounded-lg px-3 text-xs',
  md: 'min-h-11 rounded-xl px-4 text-sm',
  lg: 'min-h-12 rounded-xl px-5 text-base',
};

const ICON_SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'size-9 rounded-lg',
  md: 'size-11 rounded-xl',
  lg: 'size-12 rounded-xl',
};

/** Botón reutilizable (variantes, tamaños, carga y modo icono). El click burbujea al host. */
@Component({
  selector: 'ui-button',
  template: `
    <button
      [type]="type()"
      [disabled]="disabled() || loading()"
      [attr.aria-label]="ariaLabel()"
      [attr.aria-busy]="loading() ? 'true' : null"
      [attr.title]="ariaLabel()"
      [class]="classes()"
    >
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
  readonly size = input<ButtonSize>('md');
  readonly type = input<'button' | 'submit'>('submit');
  readonly loading = input(false);
  readonly disabled = input(false);
  readonly full = input(false);
  readonly iconOnly = input(false);
  readonly ariaLabel = input<string | null>(null);

  protected readonly classes = computed(
    () =>
      `${BASE_CLASSES} ${VARIANT_CLASSES[this.variant()]} ${
        this.iconOnly() ? ICON_SIZE_CLASSES[this.size()] : SIZE_CLASSES[this.size()]
      }${this.full() ? ' w-full' : ''}`,
  );
}
