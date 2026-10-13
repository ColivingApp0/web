import { Component, input } from '@angular/core';

/** Cabecera de página con eyebrow, título, descripción y acciones proyectadas. */
@Component({
  selector: 'ui-page-header',
  template: `
    <header class="flex flex-wrap items-end justify-between gap-4">
      <div class="min-w-0">
        @if (eyebrow(); as text) {
          <p class="ui-eyebrow">{{ text }}</p>
        }
        <h1 class="mt-1 font-display text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
          {{ title() }}
        </h1>
        @if (description(); as text) {
          <p class="mt-2 max-w-2xl text-sm leading-relaxed text-muted">{{ text }}</p>
        }
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <ng-content />
      </div>
    </header>
  `,
})
export class UiPageHeader {
  readonly eyebrow = input<string | null>(null);
  readonly title = input.required<string>();
  readonly description = input<string | null>(null);
}
