import { Component, input } from '@angular/core';
import { IconName, UiIcon } from './icon';

/** Estado vacío con instrucción útil y una acción proyectada opcional. */
@Component({
  selector: 'ui-empty-state',
  imports: [UiIcon],
  template: `
    <div class="ui-card flex flex-col items-center px-6 py-12 text-center">
      <span class="grid size-14 place-items-center rounded-2xl bg-brand-50 text-brand-700">
        <ui-icon [name]="icon()" size="xl" />
      </span>
      <h2 class="mt-4 font-display text-lg font-extrabold text-ink">{{ title() }}</h2>
      <p class="mt-1 max-w-md text-sm leading-relaxed text-muted">{{ message() }}</p>
      <div class="mt-5">
        <ng-content />
      </div>
    </div>
  `,
})
export class UiEmptyState {
  readonly icon = input<IconName>('home');
  readonly title = input.required<string>();
  readonly message = input.required<string>();
}
