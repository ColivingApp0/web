import { Component, input } from '@angular/core';
import {
  CASE_PRIORITY_CLASSES,
  CASE_PRIORITY_LABELS,
  CASE_STATUS_CLASSES,
  CASE_STATUS_LABELS,
  CasePriority,
  CaseStatus,
} from '../models/admin-models';

/**
 * Chips de estado y prioridad de un caso (compartidos por la cola y el detalle:
 * dos consumidores reales dentro de la feature). El color y la etiqueta salen del
 * contrato real; la prioridad es opcional porque no todas las vistas la muestran.
 */
@Component({
  selector: 'app-case-badges',
  template: `
    <span class="rounded-full px-3 py-1 text-xs font-bold" [class]="statusClasses()">
      {{ statusLabel() }}
    </span>
    @if (priority(); as value) {
      <span class="rounded-full px-3 py-1 text-xs font-bold" [class]="priorityClasses(value)">
        Prioridad {{ priorityLabel(value) }}
      </span>
    }
  `,
})
export class CaseBadges {
  readonly status = input.required<CaseStatus>();
  readonly priority = input<CasePriority | null>(null);

  protected readonly statusLabel = () => CASE_STATUS_LABELS[this.status()];
  protected readonly statusClasses = () => CASE_STATUS_CLASSES[this.status()];
  protected readonly priorityLabel = (priority: CasePriority) => CASE_PRIORITY_LABELS[priority];
  protected readonly priorityClasses = (priority: CasePriority) => CASE_PRIORITY_CLASSES[priority];
}
