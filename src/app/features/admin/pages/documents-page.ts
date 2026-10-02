import { DatePipe } from '@angular/common';
import { Component, computed, inject, resource, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { toApiError } from '../../../core/http/api-error';
import { DocumentStatus } from '../../../core/auth/identity-contract';
import { UiAlert } from '../../../shared/ui/alert';
import { UiButton } from '../../../shared/ui/button';
import { UiFormField } from '../../../shared/ui/form-field';
import { AdminApi, AdminDocumentSummary } from '../data-access/admin-api';
import { describeAdminError } from '../data-access/admin-errors';
import {
  DOCUMENT_STATUS_CLASSES,
  DOCUMENT_STATUS_LABELS,
  DOCUMENT_TYPE_LABELS,
  canReviewDocument,
} from '../models/admin-models';
import { ReasonForm } from '../ui/reason-form';

const STATUS_FILTERS: readonly DocumentStatus[] = [
  'PENDIENTE',
  'APROBADO',
  'RECHAZADO',
  'CORRECCION_SOLICITADA',
];

/**
 * Revisión de documentos de verificación (RF-080): aprobar sin motivo, o
 * rechazar / solicitar corrección con motivo obligatorio. Solo los documentos
 * `PENDIENTE` se pueden revisar (`requirePending` del dominio ⇒ 500 en otro
 * estado), así que la UI no ofrece acciones sobre los ya resueltos.
 *
 * Limitación real del contrato: `DocumentSummary` solo trae el tipo, el estado y
 * las fechas — **no expone el usuario ni el archivo**, así que el moderador no
 * puede ver a quién pertenece ni el contenido.
 */
@Component({
  selector: 'app-documents-page',
  imports: [DatePipe, UiAlert, UiButton, UiFormField, ReasonForm],
  templateUrl: './documents-page.html',
})
export class DocumentsPage {
  private readonly api = inject(AdminApi);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly queryParams = toSignal(this.route.queryParamMap, { requireSync: true });

  protected readonly statusLabels = DOCUMENT_STATUS_LABELS;
  protected readonly statusClasses = DOCUMENT_STATUS_CLASSES;
  protected readonly typeLabels = DOCUMENT_TYPE_LABELS;
  protected readonly statusOptions = STATUS_FILTERS;

  protected readonly statusFilter = computed<DocumentStatus | null>(() => {
    const value = this.queryParams().get('estado');
    return STATUS_FILTERS.includes(value as DocumentStatus) ? (value as DocumentStatus) : null;
  });

  protected readonly documentsResource = resource({
    params: () => this.statusFilter() ?? 'TODOS',
    loader: () => this.api.listDocuments(this.statusFilter()),
  });
  protected readonly documents = computed(() => this.documentsResource.value() ?? []);
  protected readonly loading = computed(() => this.documentsResource.isLoading());
  protected readonly loadError = computed(() => {
    const error = this.documentsResource.error();
    return error ? toApiError(error).message : null;
  });

  protected readonly pendingDecision = signal<{
    documentId: string;
    action: 'reject' | 'correction';
  } | null>(null);
  protected readonly reason = signal('');
  protected readonly busyId = signal<string | null>(null);
  protected readonly actionError = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);

  protected canReview(document: AdminDocumentSummary): boolean {
    return canReviewDocument(document.status);
  }

  /** Acción pendiente del formulario de motivo (rechazo o corrección). */
  protected readonly pendingAction = computed(() => this.pendingDecision()?.action ?? null);

  protected isPending(document: AdminDocumentSummary, action: 'reject' | 'correction'): boolean {
    const current = this.pendingDecision();
    return current !== null && current.documentId === document.id && current.action === action;
  }

  protected changeStatus(event: Event): void {
    const target = event.target;
    const value = target instanceof HTMLSelectElement ? target.value : '';
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: value === '' ? {} : { estado: value },
    });
  }

  protected async approve(document: AdminDocumentSummary): Promise<void> {
    this.pendingDecision.set(null);
    await this.run(document.id, () => this.api.approveDocument(document.id), 'Documento aprobado.');
  }

  protected toggleDecision(document: AdminDocumentSummary, action: 'reject' | 'correction'): void {
    this.actionError.set(null);
    this.successMessage.set(null);
    this.reason.set('');
    this.pendingDecision.update((current) =>
      current?.documentId === document.id && current.action === action
        ? null
        : { documentId: document.id, action },
    );
  }

  protected async submitDecision(value: string): Promise<void> {
    const decision = this.pendingDecision();
    if (decision === null) return;
    const call =
      decision.action === 'reject'
        ? () => this.api.rejectDocument(decision.documentId, value)
        : () => this.api.requestDocumentCorrection(decision.documentId, value);
    const success =
      decision.action === 'reject' ? 'Documento rechazado.' : 'Corrección solicitada al usuario.';
    await this.run(decision.documentId, call, success);
    this.pendingDecision.set(null);
    this.reason.set('');
  }

  protected retry(): void {
    this.documentsResource.reload();
  }

  private async run(
    documentId: string,
    call: () => Promise<unknown>,
    success: string,
  ): Promise<void> {
    this.busyId.set(documentId);
    this.actionError.set(null);
    this.successMessage.set(null);
    try {
      await call();
      this.successMessage.set(success);
    } catch (error) {
      const apiError = toApiError(error);
      this.actionError.set(describeAdminError(apiError.status, apiError.code, apiError.message));
    } finally {
      this.busyId.set(null);
      this.documentsResource.reload();
    }
  }
}
