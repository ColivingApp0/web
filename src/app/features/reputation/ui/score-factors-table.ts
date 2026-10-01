import { DecimalPipe } from '@angular/common';
import { Component, input } from '@angular/core';
import { ScoreFactor, scoreFactorLabel } from '../models/reputation-models';

/**
 * Tabla de los factores documentados del score (RF-071): el usuario debe poder
 * consultar **qué influye** y con qué peso; los valores vienen calculados por el
 * backend (peso, valor normalizado y contribución), la UI no los recalcula.
 */
@Component({
  selector: 'app-score-factors-table',
  imports: [DecimalPipe],
  template: `
    <table class="w-full border-collapse text-sm">
      <caption class="sr-only">
        Factores que influyen en el score de reputación
      </caption>
      <thead>
        <tr class="text-left text-xs uppercase tracking-wide text-muted">
          <th scope="col" class="py-2">Factor</th>
          <th scope="col" class="py-2">Peso</th>
          <th scope="col" class="py-2">Valor normalizado</th>
          <th scope="col" class="py-2">Contribución</th>
        </tr>
      </thead>
      <tbody>
        @for (factor of factors(); track factor.name) {
          <tr class="border-t border-line">
            <th scope="row" class="py-2 text-left font-semibold text-ink">
              {{ label(factor.name) }}
            </th>
            <td class="py-2 text-ink">{{ factor.weight | number: '1.0-2' }}</td>
            <td class="py-2 text-ink">{{ factor.normalizedValue | number: '1.0-2' }}</td>
            <td class="py-2 text-ink">{{ factor.contribution | number: '1.0-2' }}</td>
          </tr>
        }
      </tbody>
    </table>
  `,
})
export class ScoreFactorsTable {
  readonly factors = input.required<readonly ScoreFactor[]>();

  protected label(name: string): string {
    return scoreFactorLabel(name);
  }
}
