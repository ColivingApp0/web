import { Component, computed, input, model, output, signal } from '@angular/core';
import { UiAlert } from '../../../shared/ui/alert';
import { UiButton } from '../../../shared/ui/button';
import { UiFormField } from '../../../shared/ui/form-field';
import { MAX_CASE_NOTE_LENGTH, caseNoteError } from '../models/admin-models';

/**
 * Bloque de decisión con motivo obligatorio (RF-080, RF-081, RF-082): es el
 * mismo patrón real en cuatro acciones administrativas (rechazar y solicitar
 * corrección de documentos, resolver y rechazar casos, y la nota de la revisión
 * de publicaciones), así que vive como componente interno de la feature.
 *
 * El valor es un `model()` para que la página pueda limpiarlo tras el éxito; la
 * validación local espeja el límite real (≤1000) y el servidor sigue siendo la
 * autoridad.
 */
@Component({
  selector: 'app-reason-form',
  imports: [UiAlert, UiButton, UiFormField],
  template: `
    <div class="space-y-3">
      <ui-form-field
        [htmlFor]="htmlFor()"
        [label]="label()"
        [error]="localError()"
        [hint]="hint() ?? 'Obligatorio. Máximo ' + maxLength() + ' caracteres.'"
      >
        <textarea
          [id]="htmlFor()"
          rows="2"
          [value]="value()"
          (input)="onInput($event)"
          [attr.aria-describedby]="localError() ? htmlFor() + '-error' : null"
          [attr.aria-invalid]="localError() ? 'true' : null"
          class="w-full resize-y rounded-xl border border-line bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20"
        ></textarea>
      </ui-form-field>

      <ui-alert [message]="error()" />

      <ui-button type="button" [loading]="loading()" (click)="submit()">{{
        submitLabel()
      }}</ui-button>
    </div>
  `,
})
export class ReasonForm {
  readonly label = input.required<string>();
  readonly htmlFor = input.required<string>();
  readonly submitLabel = input.required<string>();
  readonly maxLength = input(MAX_CASE_NOTE_LENGTH);
  readonly hint = input<string | null>(null);
  readonly loading = input(false);
  readonly error = input<string | null>(null);
  readonly value = model('');

  readonly submitted = output<string>();

  private readonly touched = signal(false);

  protected readonly localError = computed(() => {
    if (!this.touched()) return null;
    const message = caseNoteError(this.value(), this.label());
    return message;
  });

  protected onInput(event: Event): void {
    const target = event.target;
    this.value.set(target instanceof HTMLTextAreaElement ? target.value : '');
    this.touched.set(false);
  }

  protected submit(): void {
    this.touched.set(true);
    const message = caseNoteError(this.value(), this.label());
    if (message !== null) return;
    this.submitted.emit(this.value().trim());
  }
}
