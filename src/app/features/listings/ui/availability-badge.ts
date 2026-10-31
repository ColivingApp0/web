import { Component, computed, input } from '@angular/core';

export type AvailabilityTone =
  'available' | 'last' | 'full' | 'paused' | 'draft' | 'review' | 'archived';

const TONES: Record<AvailabilityTone, { label: string; classes: string; dot: string }> = {
  available: {
    label: 'Disponible',
    classes: 'bg-brand-50 text-brand-800 border-brand-200',
    dot: 'bg-brand-600',
  },
  last: {
    label: 'Últimas plazas',
    classes: 'bg-warning-50 text-warning-700 border-accent-200',
    dot: 'bg-accent-500',
  },
  full: {
    label: 'Ocupada',
    classes: 'bg-danger-50 text-danger-700 border-danger-100',
    dot: 'bg-danger-600',
  },
  paused: { label: 'Pausada', classes: 'bg-soft text-ink-soft border-line', dot: 'bg-muted' },
  draft: { label: 'Borrador', classes: 'bg-soft text-muted border-line', dot: 'bg-line-strong' },
  review: {
    label: 'En revisión',
    classes: 'bg-sky-soft text-[#0c4a6e] border-[#bae6fd]',
    dot: 'bg-[#0284c7]',
  },
  archived: {
    label: 'Archivada',
    classes: 'bg-soft text-muted border-line',
    dot: 'bg-line-strong',
  },
};

/** Convierte la etiqueta real del backend en un tono visual coherente. */
export function availabilityTone(label: string): AvailabilityTone {
  const normalized = label.toLowerCase();
  if (normalized.includes('última') || normalized.includes('ultima')) return 'last';
  if (normalized.includes('ocupada') || normalized.includes('completa')) return 'full';
  if (normalized.includes('pausada') || normalized.includes('no disponible')) return 'paused';
  if (normalized.includes('borrador')) return 'draft';
  if (normalized.includes('revisión') || normalized.includes('revision')) return 'review';
  if (normalized.includes('archivada')) return 'archived';
  return 'available';
}

/** Indicador de disponibilidad mensual: nunca usa fechas ni calendarios. */
@Component({
  selector: 'ui-availability-badge',
  template: `
    <span
      [class]="classes()"
      class="inline-flex items-center gap-1.5 rounded-pill border px-2.5 py-1 text-xs font-bold"
    >
      <span [class]="dotClass()" class="size-1.5 rounded-full" aria-hidden="true"></span>
      {{ displayLabel() }}
      @if (placesLabel(); as places) {
        <span class="font-semibold opacity-75">· {{ places }}</span>
      }
    </span>
  `,
})
export class UiAvailabilityBadge {
  readonly label = input.required<string>();
  readonly availablePlaces = input<number | null>(null);

  protected readonly tone = computed(() => TONES[availabilityTone(this.label())]);
  protected readonly displayLabel = computed(() => this.tone().label);
  protected readonly classes = computed(() => this.tone().classes);
  protected readonly dotClass = computed(() => this.tone().dot);
  protected readonly placesLabel = computed(() => {
    const places = this.availablePlaces();
    if (places === null || places < 0) return null;
    return places === 1 ? '1 plaza libre' : `${places} plazas libres`;
  });
}
