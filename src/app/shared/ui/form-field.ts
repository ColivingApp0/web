import { Component, input } from '@angular/core';

/**
 * Campo de formulario accesible: etiqueta asociada, contenido proyectado (el
 * control) y mensaje de error o ayuda. La página calcula el mensaje (validación
 * local o `fieldErrors` del backend) y conecta `aria-describedby` con el id
 * `<htmlFor>-error`.
 */
@Component({
  selector: 'ui-form-field',
  template: `
    <div>
      <label [for]="htmlFor()" class="mb-1 block text-sm font-semibold text-ink">{{
        label()
      }}</label>
      <ng-content />
      @if (error(); as message) {
        <p [id]="htmlFor() + '-error'" class="mt-1 text-xs font-medium text-red-700">
          {{ message }}
        </p>
      } @else if (hint(); as hintText) {
        <p class="mt-1 text-xs text-muted">{{ hintText }}</p>
      }
    </div>
  `,
})
export class UiFormField {
  readonly htmlFor = input.required<string>();
  readonly label = input.required<string>();
  readonly error = input<string | null>(null);
  readonly hint = input<string | null>(null);
}
