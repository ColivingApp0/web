import { Component, computed, input } from '@angular/core';

export type AlertVariant = 'error' | 'success' | 'info';

const VARIANT_CLASSES: Record<AlertVariant, string> = {
  error: 'border-red-200 bg-red-50 text-red-800',
  success: 'border-brand-700/20 bg-brand-700/10 text-brand-800',
  info: 'border-line bg-white text-ink',
};

/** Aviso accesible para errores globales y confirmaciones. */
@Component({
  selector: 'ui-alert',
  template: `
    @if (message(); as text) {
      <div
        [class]="classes()"
        [attr.role]="variant() === 'error' ? 'alert' : 'status'"
        class="rounded-xl border px-4 py-3 text-sm font-medium"
      >
        {{ text }}
      </div>
    }
  `,
})
export class UiAlert {
  readonly variant = input<AlertVariant>('error');
  readonly message = input<string | null>(null);

  protected readonly classes = computed(() => VARIANT_CLASSES[this.variant()]);
}
