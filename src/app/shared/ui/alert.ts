import { Component, computed, input } from '@angular/core';
import { IconName, UiIcon } from './icon';

export type AlertVariant = 'error' | 'success' | 'info' | 'warning';

const VARIANT_CLASSES: Record<AlertVariant, string> = {
  error: 'border-danger-100 bg-danger-50 text-danger-700',
  success: 'border-brand-200 bg-brand-50 text-brand-800',
  info: 'border-line bg-soft text-ink',
  warning: 'border-accent-200 bg-warning-50 text-warning-700',
};

const ICONS: Record<AlertVariant, IconName> = {
  error: 'alert-circle',
  success: 'check-circle',
  info: 'info',
  warning: 'alert-circle',
};

/** Aviso accesible para errores globales y confirmaciones. */
@Component({
  selector: 'ui-alert',
  imports: [UiIcon],
  template: `
    @if (message(); as text) {
      <div
        [class]="classes()"
        [attr.role]="variant() === 'error' ? 'alert' : 'status'"
        class="flex items-start gap-2.5 rounded-xl border px-4 py-3 text-sm font-medium"
      >
        <ui-icon [name]="icon()" size="sm" class="mt-0.5" />
        <span>{{ text }}</span>
      </div>
    }
  `,
})
export class UiAlert {
  readonly variant = input<AlertVariant>('error');
  readonly message = input<string | null>(null);

  protected readonly classes = computed(() => VARIANT_CLASSES[this.variant()]);
  protected readonly icon = computed(() => ICONS[this.variant()]);
}
