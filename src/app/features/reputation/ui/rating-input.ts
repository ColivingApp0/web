import { Component, computed, input, output } from '@angular/core';
import { EvaluationCategory, MAX_RATING, MIN_RATING } from '../models/reputation-models';

/**
 * Valoración 1..5 de una categoría (RF-070). Usa un grupo de radios con nombre
 * por categoría para que sea navegable con teclado y anunciado correctamente; el
 * valor lo posee la página (el componente no guarda estado).
 */
@Component({
  selector: 'app-rating-input',
  template: `
    <fieldset class="rounded-xl border border-line p-3">
      <legend class="px-1 text-sm font-semibold text-ink">{{ label() }}</legend>
      <div class="flex flex-wrap gap-2" role="radiogroup" [attr.aria-label]="label()">
        @for (option of options; track option) {
          <label
            class="flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-1.5 text-sm"
            [class]="value() === option ? 'border-brand-700 bg-brand-700/10' : 'border-line'"
          >
            <input
              type="radio"
              [name]="groupName()"
              [value]="option"
              [checked]="value() === option"
              (change)="select(option)"
              class="size-4"
            />
            <span>{{ option }}</span>
          </label>
        }
      </div>
    </fieldset>
  `,
})
export class RatingInput {
  readonly category = input.required<EvaluationCategory>();
  readonly label = input.required<string>();
  readonly value = input.required<number>();
  readonly valueChange = output<number>();

  protected readonly options: number[] = Array.from(
    { length: MAX_RATING - MIN_RATING + 1 },
    (_unused, index) => MIN_RATING + index,
  );
  protected readonly groupName = computed(() => `rating-${this.category()}`);

  protected select(option: number): void {
    this.valueChange.emit(option);
  }
}
