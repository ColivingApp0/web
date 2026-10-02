import { Component, computed, inject, resource, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { toApiError } from '../../../core/http/api-error';
import { UiAlert } from '../../../shared/ui/alert';
import { UiButton } from '../../../shared/ui/button';
import { UiFormField } from '../../../shared/ui/form-field';
import { AdminApi } from '../data-access/admin-api';
import { describeAdminError } from '../data-access/admin-errors';
import {
  AdminPublicationView,
  PUBLICATION_STATUS_LABELS,
  PublicationStatus,
  REVIEW_DECISION_LABELS,
  REVIEW_DECISION_OUTCOMES,
  ReviewDecision,
  canReviewPublication,
  reviewNoteError,
} from '../models/admin-models';

const CONSULT_STATUSES: readonly PublicationStatus[] = [
  'PUBLICADA',
  'BORRADOR',
  'PAUSADA',
  'OCULTA',
  'ARCHIVADA',
];

const DECISIONS: readonly ReviewDecision[] = ['APROBADA', 'RECHAZADA', 'CORRECCION_SOLICITADA'];

/**
 * Moderación de publicaciones (RF-081). Sin parámetro de estado el backend
 * devuelve **la cola de revisión** (`EN_REVISION`); con `estado` se consulta un
 * estado concreto para revisar decisiones ya tomadas.
 *
 * Solo se puede revisar desde `EN_REVISION` (`require` del dominio ⇒ 500 en otro
 * estado), así que la UI ofrece la decisión únicamente a las publicaciones en
 * revisión. La nota es obligatoria salvo al aprobar.
 */
@Component({
  selector: 'app-publications-page',
  imports: [UiAlert, UiButton, UiFormField],
  templateUrl: './publications-page.html',
})
export class PublicationsPage {
  private readonly api = inject(AdminApi);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly queryParams = toSignal(this.route.queryParamMap, { requireSync: true });

  protected readonly statusLabels = PUBLICATION_STATUS_LABELS;
  protected readonly decisionLabels = REVIEW_DECISION_LABELS;
  protected readonly decisionOutcomes = REVIEW_DECISION_OUTCOMES;
  protected readonly statusOptions = CONSULT_STATUSES;
  protected readonly decisions = DECISIONS;

  protected readonly statusFilter = computed<PublicationStatus | null>(() => {
    const value = this.queryParams().get('estado');
    return CONSULT_STATUSES.includes(value as PublicationStatus)
      ? (value as PublicationStatus)
      : null;
  });

  protected readonly queueResource = resource({
    params: () => this.statusFilter() ?? 'COLA_EN_REVISION',
    loader: () => this.api.publicationsQueue(this.statusFilter()),
  });
  protected readonly publications = computed(() => this.queueResource.value() ?? []);
  protected readonly loading = computed(() => this.queueResource.isLoading());
  protected readonly loadError = computed(() => {
    const error = this.queueResource.error();
    return error ? toApiError(error).message : null;
  });

  protected readonly reviewingId = signal<string | null>(null);
  protected readonly decision = signal<ReviewDecision>('APROBADA');
  protected readonly note = signal('');
  private readonly noteTouched = signal(false);
  protected readonly busy = signal(false);
  protected readonly actionError = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);

  protected readonly noteIssue = computed(() => {
    if (!this.noteTouched()) return null;
    return reviewNoteError(this.decision(), this.note());
  });

  protected canReview(publication: AdminPublicationView): boolean {
    return canReviewPublication(publication.status);
  }

  protected changeStatus(event: Event): void {
    const value = event.target instanceof HTMLSelectElement ? event.target.value : '';
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: value === '' ? {} : { estado: value },
    });
  }

  protected startReview(publication: AdminPublicationView): void {
    this.actionError.set(null);
    this.successMessage.set(null);
    this.note.set('');
    this.noteTouched.set(false);
    this.decision.set('APROBADA');
    this.reviewingId.update((current) => (current === publication.id ? null : publication.id));
  }

  protected changeDecision(event: Event): void {
    const value = event.target instanceof HTMLSelectElement ? event.target.value : '';
    if (value === 'APROBADA' || value === 'RECHAZADA' || value === 'CORRECCION_SOLICITADA') {
      this.decision.set(value);
    }
  }

  protected changeNote(event: Event): void {
    const target = event.target;
    this.note.set(target instanceof HTMLTextAreaElement ? target.value : '');
    this.noteTouched.set(false);
  }

  protected async submitReview(publication: AdminPublicationView): Promise<void> {
    this.noteTouched.set(true);
    if (reviewNoteError(this.decision(), this.note()) !== null) return;

    this.busy.set(true);
    this.actionError.set(null);
    this.successMessage.set(null);
    const note = this.note().trim();
    try {
      const reviewed = await this.api.reviewPublication(
        publication.id,
        this.decision(),
        note === '' ? null : note,
      );
      this.successMessage.set(
        `Decisión registrada: ${this.decisionLabels[this.decision()].toLowerCase()}. La publicación queda en «${this.statusLabels[reviewed.status]}».`,
      );
      this.reviewingId.set(null);
      this.note.set('');
    } catch (error) {
      const apiError = toApiError(error);
      this.actionError.set(describeAdminError(apiError.status, apiError.code, apiError.message));
    } finally {
      this.busy.set(false);
      this.queueResource.reload();
    }
  }

  protected retry(): void {
    this.queueResource.reload();
  }
}
