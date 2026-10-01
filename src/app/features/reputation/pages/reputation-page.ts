import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, inject, resource } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthSession } from '../../../core/auth/auth-session';
import { toApiError } from '../../../core/http/api-error';
import { UiAlert } from '../../../shared/ui/alert';
import { UiButton } from '../../../shared/ui/button';
import { ReputationApi } from '../data-access/reputation-api';
import {
  EVALUATION_STATUS_CLASSES,
  EVALUATION_STATUS_LABELS,
  EvaluationView,
  ReputationView,
} from '../models/reputation-models';
import { ScoreFactorsTable } from '../ui/score-factors-table';

/**
 * Reputación consultable (RF-071) con sus factores, la versión de la fórmula y
 * los beneficios vigentes (RF-073, solo lectura).
 *
 * La misma página sirve para **mi reputación** (`/reputacion`) y para la de otro
 * usuario (`/reputacion/usuario/:id`, alcanzable desde el anfitrión en el
 * contexto de una reserva). El backend expone ambas a cualquier autenticado; aquí
 * no se amplía el alcance ni se acopla con otras features para resolver ids.
 *
 * Ojo con el contrato: `GET /users/{id}/reputation` **calcula y guarda un
 * snapshot en cada lectura**, así que se consulta una vez por visita y solo se
 * vuelve a pedir con «Recalcular» (acción explícita). Sin bucles ni polling.
 */
@Component({
  selector: 'app-reputation-page',
  imports: [RouterLink, DatePipe, DecimalPipe, UiAlert, UiButton, ScoreFactorsTable],
  templateUrl: './reputation-page.html',
})
export class ReputationPage {
  private readonly route = inject(ActivatedRoute);
  private readonly session = inject(AuthSession);
  private readonly api = inject(ReputationApi);

  private readonly params = toSignal(this.route.paramMap, { requireSync: true });
  private readonly routeUserId = computed(() => this.params().get('id') ?? '');
  protected readonly myUserId = computed(() => this.session.user()?.userId ?? '');

  /** Objetivo: el usuario de la ruta o, si no hay, el autenticado. */
  protected readonly targetUserId = computed(() => this.routeUserId() || this.myUserId());
  protected readonly isSelf = computed(
    () => this.targetUserId() !== '' && this.targetUserId() === this.myUserId(),
  );

  protected readonly reputationResource = resource<ReputationView | null, string | null>({
    params: () => (this.targetUserId() === '' ? null : this.targetUserId()),
    loader: ({ params }) => (params === null ? Promise.resolve(null) : this.api.reputation(params)),
  });
  protected readonly reputation = computed(() => this.reputationResource.value() ?? null);
  protected readonly loading = computed(() => this.reputationResource.isLoading());
  protected readonly loadError = computed(() => {
    const error = this.reputationResource.error();
    return error ? toApiError(error).message : null;
  });

  protected readonly receivedResource = resource<EvaluationView[], string | null>({
    params: () => (this.targetUserId() === '' ? null : this.targetUserId()),
    loader: ({ params }) => (params === null ? Promise.resolve([]) : this.api.listReceived(params)),
  });
  protected readonly received = computed(() => this.receivedResource.value() ?? []);
  protected readonly statusLabels = EVALUATION_STATUS_LABELS;
  protected readonly statusClasses = EVALUATION_STATUS_CLASSES;

  protected retry(): void {
    this.reputationResource.reload();
    this.receivedResource.reload();
  }

  /** Recálculo explícito: el endpoint guarda un snapshot por lectura. */
  protected recalculate(): void {
    this.reputationResource.reload();
  }

  protected commentsOf(evaluation: EvaluationView): string | null {
    return evaluation.comment;
  }
}
