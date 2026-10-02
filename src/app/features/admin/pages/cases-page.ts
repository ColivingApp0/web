import { Component, computed, inject, resource, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { toApiError } from '../../../core/http/api-error';
import { UiAlert } from '../../../shared/ui/alert';
import { UiButton } from '../../../shared/ui/button';
import { UiFormField } from '../../../shared/ui/form-field';
import { AdminApi } from '../data-access/admin-api';
import {
  CASE_PRIORITY_LABELS,
  CASE_STATUS_LABELS,
  CASE_SUBJECT_LABELS,
  CASE_TYPE_LABELS,
  CaseFilters,
  CaseView,
  EMPTY_CASE_FILTERS,
  ModerationMetricsView,
  caseFiltersFromParams,
  caseFiltersToParams,
} from '../models/admin-models';
import { CaseBadges } from '../ui/case-badges';

/**
 * Cola de casos (RF-082): reportes y disputas con los filtros reales del backend
 * (`type`, `status`, `priority`, `assigneeUserId`, `onlyOpen`).
 *
 * Los filtros viven en los **query params** (la URL es el estado: se comparte y
 * sobrevive a la recarga) y el listado se pide con `resource()` por página; no se
 * introduce store. El backend no pagina ni ordena, así que la cola llega completa.
 */
@Component({
  selector: 'app-cases-page',
  imports: [RouterLink, UiAlert, UiButton, UiFormField, CaseBadges],
  templateUrl: './cases-page.html',
})
export class CasesPage {
  private readonly api = inject(AdminApi);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  private readonly queryParams = toSignal(this.route.queryParamMap, { requireSync: true });

  protected readonly typeLabels = CASE_TYPE_LABELS;
  protected readonly statusLabels = CASE_STATUS_LABELS;
  protected readonly priorityLabels = CASE_PRIORITY_LABELS;
  protected readonly subjectLabels = CASE_SUBJECT_LABELS;
  protected readonly filterStatusOptions = [
    'ABIERTO',
    'EN_REVISION',
    'RESUELTO',
    'RECHAZADO',
  ] as const;

  /** Filtros activos, derivados de la URL (fuente de verdad). */
  protected readonly filters = computed(() => caseFiltersFromParams(this.queryParams()));

  /** Borrador del formulario: se aplica a la URL al enviar. */
  private readonly draft = signal<CaseFilters>({ ...this.filters() });
  protected readonly draftFilters = computed(() => this.draft());

  protected readonly hasFilters = computed(
    () => Object.keys(caseFiltersToParams(this.filters())).length > 0,
  );

  protected readonly casesResource = resource({
    params: () => JSON.stringify(this.filters()),
    loader: () => this.api.listCases(this.filters()),
  });
  protected readonly cases = computed(() => this.casesResource.value() ?? []);
  protected readonly loading = computed(() => this.casesResource.isLoading());
  protected readonly loadError = computed(() => {
    const error = this.casesResource.error();
    return error ? toApiError(error).message : null;
  });

  protected readonly metricsResource = resource({ loader: () => this.api.metrics() });
  protected readonly metrics = computed<ModerationMetricsView | null>(
    () => this.metricsResource.value() ?? null,
  );

  protected onFilterChange(
    field: 'type' | 'status' | 'priority' | 'assigneeUserId',
    event: Event,
  ): void {
    const value = readControlValue(event);
    if (value === null) return;
    this.draft.update((current) => ({ ...current, [field]: value }));
  }

  protected onOnlyOpenChange(event: Event): void {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;
    this.draft.update((current) => ({ ...current, onlyOpen: target.checked }));
  }

  protected applyFilters(): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: caseFiltersToParams(this.draft()),
    });
  }

  protected clearFilters(): void {
    this.draft.set({ ...EMPTY_CASE_FILTERS });
    void this.router.navigate([], { relativeTo: this.route, queryParams: {} });
  }

  protected retry(): void {
    this.casesResource.reload();
    this.metricsResource.reload();
  }

  protected openedBy(caseView: CaseView): string {
    return caseView.openedByUserId ?? 'Sistema';
  }

  protected assignee(caseView: CaseView): string {
    return caseView.assigneeUserId ?? 'Sin responsable';
  }
}

function readControlValue(event: Event): string | null {
  const target = event.target;
  if (target instanceof HTMLInputElement || target instanceof HTMLSelectElement) {
    return target.value;
  }
  return null;
}
