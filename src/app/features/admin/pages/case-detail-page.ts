import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, inject, resource, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toApiError } from '../../../core/http/api-error';
import { UiAlert } from '../../../shared/ui/alert';
import { UiButton } from '../../../shared/ui/button';
import { AdminApi } from '../data-access/admin-api';
import { describeAdminError } from '../data-access/admin-errors';
import {
  CASE_EVENT_LABELS,
  CASE_PRIORITY_LABELS,
  CASE_STATUS_LABELS,
  CASE_SUBJECT_LABELS,
  CASE_TYPE_LABELS,
  CaseDetailView,
  CaseStatus,
  caseActions,
  isCaseOpen,
} from '../models/admin-models';
import { CaseBadges } from '../ui/case-badges';
import { ReasonForm } from '../ui/reason-form';

/**
 * Detalle de un caso (RF-082): datos, **trazabilidad completa** (`events[]`, lo
 * único auditable que el backend expone) y las acciones reales según el estado:
 * asignar, iniciar revisión, resolver y rechazar (las dos últimas con motivo
 * obligatorio). Los casos terminales no admiten acción alguna; la vista no
 * ofrece botones imposibles y, si el estado cambió, refleja el error real.
 */
@Component({
  selector: 'app-case-detail-page',
  imports: [RouterLink, DatePipe, DecimalPipe, UiAlert, UiButton, CaseBadges, ReasonForm],
  templateUrl: './case-detail-page.html',
})
export class CaseDetailPage {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(AdminApi);

  private readonly params = toSignal(this.route.paramMap, { requireSync: true });
  protected readonly caseId = computed(() => this.params().get('id') ?? '');

  protected readonly typeLabels = CASE_TYPE_LABELS;
  protected readonly subjectLabels = CASE_SUBJECT_LABELS;
  protected readonly priorityLabels = CASE_PRIORITY_LABELS;
  protected readonly statusLabels = CASE_STATUS_LABELS;
  protected readonly eventLabels = CASE_EVENT_LABELS;

  protected readonly detailResource = resource<CaseDetailView | null, string | null>({
    params: () => (this.caseId() === '' ? null : this.caseId()),
    loader: ({ params }) => (params === null ? Promise.resolve(null) : this.api.caseDetail(params)),
  });
  protected readonly detail = computed(() => this.detailResource.value() ?? null);
  protected readonly caseView = computed(() => this.detail()?.case ?? null);
  protected readonly events = computed(() => this.detail()?.events ?? []);
  protected readonly loading = computed(() => this.detailResource.isLoading());
  protected readonly loadError = computed(() => {
    const error = this.detailResource.error();
    if (!error) return null;
    const apiError = toApiError(error);
    if (apiError.status === 404) return 'No encontramos este caso.';
    if (apiError.status === 403) return 'Tu sesión no tiene permisos internos para ver casos.';
    return apiError.message;
  });

  protected readonly actions = computed(() => {
    const status: CaseStatus | null = this.caseView()?.status ?? null;
    return status === null
      ? { canAssign: false, canStartReview: false, canResolve: false, canReject: false }
      : caseActions(status);
  });
  protected readonly isOpen = computed(() => {
    const status = this.caseView()?.status;
    return status !== undefined && isCaseOpen(status);
  });

  protected readonly busy = signal<'assign' | 'review' | 'resolve' | 'reject' | null>(null);
  protected readonly actionError = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);
  protected readonly resolution = signal('');
  protected readonly rejectionReason = signal('');

  protected async assign(): Promise<void> {
    await this.run(
      'assign',
      () => this.api.assignCase(this.caseId()),
      'Caso asignado a tu usuario.',
    );
  }

  protected async startReview(): Promise<void> {
    await this.run('review', () => this.api.startCaseReview(this.caseId()), 'Revisión iniciada.');
  }

  protected async resolve(resolution: string): Promise<void> {
    await this.run(
      'resolve',
      () => this.api.resolveCase(this.caseId(), resolution),
      'Caso resuelto con la resolución registrada.',
    );
    this.resolution.set('');
  }

  protected async reject(reason: string): Promise<void> {
    await this.run(
      'reject',
      () => this.api.rejectCase(this.caseId(), reason),
      'Caso rechazado con el motivo registrado.',
    );
    this.rejectionReason.set('');
  }

  protected retry(): void {
    this.detailResource.reload();
  }

  private async run(
    action: 'assign' | 'review' | 'resolve' | 'reject',
    call: () => Promise<unknown>,
    success: string,
  ): Promise<void> {
    this.busy.set(action);
    this.actionError.set(null);
    this.successMessage.set(null);
    try {
      await call();
      this.successMessage.set(success);
    } catch (error) {
      const apiError = toApiError(error);
      this.actionError.set(describeAdminError(apiError.status, apiError.code, apiError.message));
    } finally {
      this.busy.set(null);
      // El estado real manda: se relee el caso tras cada intento.
      this.detailResource.reload();
    }
  }
}
