import { Component, input } from '@angular/core';

/**
 * Campo de formulario accesible: etiqueta asociada, contenido proyectado (el
 * control) y mensaje de error o ayuda. `aria-describedby` se conecta con el id
 * `<htmlFor>-error` desde la página.
 */
@Component({
  selector: 'ui-form-field',
  template: `
    <div class="min-w-0">
      <div class="mb-1.5 flex items-baseline justify-between gap-3">
        <label [for]="htmlFor()" class="text-sm font-semibold text-ink">{{ label() }}</label>
        @if (required()) {
          <span class="text-[11px] font-semibold uppercase tracking-wide text-muted"
            >Obligatorio</span
          >
        }
      </div>
      <ng-content />
      @if (error(); as message) {
        <p
          [id]="htmlFor() + '-error'"
          class="mt-1.5 flex items-start gap-1 text-xs font-semibold text-danger-700"
        >
          <span aria-hidden="true">·</span>{{ message }}
        </p>
      } @else if (hint(); as hintText) {
        <p class="mt-1.5 text-xs leading-relaxed text-muted">{{ hintText }}</p>
      }
    </div>
  `,
})
export class UiFormField {
  readonly htmlFor = input.required<string>();
  readonly label = input.required<string>();
  readonly error = input<string | null>(null);
  readonly hint = input<string | null>(null);
  readonly required = input(false);
}
