import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, inject, resource, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthSession } from '../../../core/auth/auth-session';
import { toApiError } from '../../../core/http/api-error';
import { UiAlert } from '../../../shared/ui/alert';
import { UiButton } from '../../../shared/ui/button';
import { UiFormField } from '../../../shared/ui/form-field';
import { ReputationApi } from '../data-access/reputation-api';
import {
  DISPUTE_REASON_MAX_LENGTH,
  EVALUATION_STATUS_CLASSES,
  EVALUATION_STATUS_LABELS,
  EvaluationView,
  disputeReasonError,
} from '../models/reputation-models';

/**
 * Mis evaluaciones (RF-070/RF-072): las que **escribí** y las que **recibí**, con
 * la disputa de una evaluación recibida (solo el evaluado puede, abre caso en
 * moderación y suspende su efecto hasta resolverse).
 *
 * Sin store: dos `resource()` y recarga tras disputar.
 */
@Component({
  selector: 'app-evaluations-page',
  imports: [RouterLink, DatePipe, DecimalPipe, UiAlert, UiButton, UiFormField],
  templateUrl: './evaluations-page.html',
})
export class EvaluationsPage {
  private readonly api = inject(ReputationApi);
  private readonly session = inject(AuthSession);

  protected readonly myUserId = computed(() => this.session.user()?.userId ?? '');

  protected readonly writtenResource = resource({ loader: () => this.api.listWritten() });
  protected readonly written = computed(() => this.writtenResource.value() ?? []);
  protected readonly writtenLoading = computed(() => this.writtenResource.isLoading());
  protected readonly writtenError = computed(() => {
    const error = this.writtenResource.error();
    return error ? toApiError(error).message : null;
  });

  protected readonly receivedResource = resource<EvaluationView[], string | null>({
    params: () => (this.myUserId() === '' ? null : this.myUserId()),
    loader: ({ params }) => (params === null ? Promise.resolve([]) : this.api.listReceived(params)),
  });
  protected readonly received = computed(() => this.receivedResource.value() ?? []);
  protected readonly receivedLoading = computed(() => this.receivedResource.isLoading());
  protected readonly receivedError = computed(() => {
    const error = this.receivedResource.error();
    return error ? toApiError(error).message : null;
  });

  protected readonly statusLabels = EVALUATION_STATUS_LABELS;
  protected readonly statusClasses = EVALUATION_STATUS_CLASSES;
  protected readonly reasonMaxLength = DISPUTE_REASON_MAX_LENGTH;

  protected readonly pendingDisputeId = signal<string | null>(null);
  protected readonly disputeReason = signal('');
  protected readonly disputing = signal(false);
  protected readonly disputeError = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);

  protected readonly reasonError = computed(() => {
    const reason = this.disputeReason();
    return reason === '' ? null : disputeReasonError(reason);
  });

  protected retry(): void {
    this.writtenResource.reload();
    this.receivedResource.reload();
  }

  protected toggleDispute(evaluation: EvaluationView): void {
    this.disputeError.set(null);
    this.successMessage.set(null);
    this.disputeReason.set('');
    this.pendingDisputeId.update((current) => (current === evaluation.id ? null : evaluation.id));
  }

  protected updateReason(event: Event): void {
    const target = event.target;
    this.disputeReason.set(target instanceof HTMLTextAreaElement ? target.value : '');
  }

  protected async submitDispute(evaluation: EvaluationView): Promise<void> {
    const message = disputeReasonError(this.disputeReason());
    if (message !== null) {
      this.disputeError.set(message);
      return;
    }
    this.disputing.set(true);
    this.disputeError.set(null);
    try {
      const disputed = await this.api.disputeEvaluation(evaluation.id, this.disputeReason().trim());
      this.successMessage.set(
        `Disputa registrada. Moderación revisará el caso ${disputed.disputeCaseId ?? ''} y la evaluación deja de contar para el score mientras tanto.`,
      );
      this.pendingDisputeId.set(null);
      this.disputeReason.set('');
      this.retry();
    } catch (error) {
      const apiError = toApiError(error);
      this.disputeError.set(
        apiError.status === 409
          ? `El servidor no aceptó la disputa (${apiError.code}): ${apiError.message}.`
          : apiError.status === 400
            ? `El servidor rechazó la disputa (${apiError.code}): ${apiError.message}.`
            : apiError.status === 403
              ? 'Solo la persona evaluada puede disputar esta evaluación.'
              : apiError.status === 404
                ? 'La evaluación ya no existe: actualizamos la lista.'
                : apiError.message,
      );
      if (apiError.status === 409 || apiError.status === 404) {
        this.retry();
      }
    } finally {
      this.disputing.set(false);
    }
  }
}
