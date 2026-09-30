import { DatePipe } from '@angular/common';
import { Component, computed, input } from '@angular/core';
import {
  ACTIVITY_PHASE_LABELS,
  ACTIVITY_STATUS_LABELS,
  ActivityView,
  PARTICIPATION_LABELS,
  ParticipantView,
  activityPhase,
} from '../models/community-models';

const PHASE_CLASSES: Record<string, string> = {
  ABIERTA: 'bg-brand-700/10 text-brand-800',
  CANCELADA: 'bg-red-100 text-red-800',
  PASADA: 'bg-accent-500/15 text-accent-600',
};

/**
 * Tarjeta de una actividad (misma pieza para el residente y el anfitrión: dos
 * consumidores reales). Muestra la fase **derivada de la fecha** (el backend no
 * almacena «ya pasó»), el estado almacenado, cupo y —si el usuario participa—
 * su estado de asistencia. Las acciones las aporta la página por proyección.
 */
@Component({
  selector: 'app-activity-card',
  imports: [DatePipe],
  template: `
    <article class="rounded-card border border-line bg-white p-5 shadow-card">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div class="min-w-0">
          <h3 class="font-display text-lg font-bold text-ink">{{ activity().title }}</h3>
          <p class="mt-0.5 text-sm text-muted">
            {{ activity().scheduledAt | date: 'EEEE d MMM y, HH:mm' }}
          </p>
          <p class="mt-0.5 text-xs text-muted">
            Cupo {{ activity().capacity }} · confirmados {{ activity().confirmedCount }} · plazas
            libres {{ activity().freePlaces }}
          </p>
        </div>
        <div class="flex flex-col items-end gap-1">
          <span class="rounded-full px-3 py-1 text-xs font-bold" [class]="phaseClasses()">
            {{ phaseLabel() }}
          </span>
          <span class="text-xs text-muted">{{ statusLabel() }}</span>
        </div>
      </div>

      @if (activity().description; as description) {
        <p class="mt-3 text-sm text-ink">{{ description }}</p>
      }

      @if (participation(); as current) {
        <p class="mt-3 text-xs font-semibold text-ink">
          Tu participación: {{ participationLabel(current) }}
        </p>
      }

      <div class="mt-4">
        <ng-content />
      </div>
    </article>
  `,
})
export class ActivityCard {
  readonly activity = input.required<ActivityView>();
  readonly participation = input<ParticipantView | null>(null);

  protected readonly phaseLabel = computed(
    () => ACTIVITY_PHASE_LABELS[activityPhase(this.activity(), new Date())],
  );
  protected readonly phaseClasses = computed(
    () => PHASE_CLASSES[activityPhase(this.activity(), new Date())],
  );
  protected readonly statusLabel = computed(() => ACTIVITY_STATUS_LABELS[this.activity().status]);

  protected participationLabel(participation: ParticipantView): string {
    return PARTICIPATION_LABELS[participation.status];
  }
}
