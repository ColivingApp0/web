import { Component, computed, inject, resource, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthSession } from '../../../core/auth/auth-session';
import { toApiError } from '../../../core/http/api-error';
import { UiAlert } from '../../../shared/ui/alert';
import { UiButton } from '../../../shared/ui/button';
import { CommunityApi } from '../data-access/community-api';
import {
  CommunitySummaryView,
  PARTICIPATION_LABELS,
  ParticipantView,
  canConfirm,
  canWithdraw,
  myParticipation,
} from '../models/community-models';
import { ActivityCard } from '../ui/activity-card';

/**
 * Detalle de una actividad para el residente (`GET /community/activities/{id}`,
 * RF-061/RF-062): participantes, mi estado de asistencia, acciones de confirmar
 * y retirarse, y el **resumen agregado** de la comunidad de la propiedad (solo
 * contadores y solo si hay consentimiento suficiente).
 *
 * El servidor decide el cupo (lock en la confirmación): cualquier 409 se muestra
 * tal cual y la página se recarga con el estado real.
 */
@Component({
  selector: 'app-activity-detail-page',
  imports: [RouterLink, UiAlert, UiButton, ActivityCard],
  templateUrl: './activity-detail-page.html',
})
export class ActivityDetailPage {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(CommunityApi);
  private readonly session = inject(AuthSession);

  private readonly params = toSignal(this.route.paramMap, { requireSync: true });
  protected readonly activityId = computed(() => this.params().get('id') ?? '');

  protected readonly detailResource = resource({
    params: () => this.activityId(),
    loader: ({ params }) => this.api.activityDetail(params),
  });
  protected readonly detail = computed(() => this.detailResource.value() ?? null);
  protected readonly loading = computed(() => this.detailResource.isLoading());
  protected readonly loadError = computed(() => {
    const error = this.detailResource.error();
    if (!error) {
      return null;
    }
    const apiError = toApiError(error);
    return apiError.status === 403
      ? 'No formas parte de la comunidad autorizada de esta actividad.'
      : apiError.status === 404
        ? 'No encontramos esta actividad.'
        : apiError.message;
  });

  protected readonly myUserId = computed(() => this.session.user()?.userId ?? '');
  protected readonly participation = computed(() => {
    const detail = this.detail();
    return detail === null ? null : myParticipation(detail, this.myUserId());
  });
  protected readonly participationLabels = PARTICIPATION_LABELS;

  protected readonly busyAction = signal<'confirm' | 'withdraw' | null>(null);
  protected readonly actionError = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);

  protected readonly summaryResource = resource<CommunitySummaryView | null, string | null>({
    params: () => this.detail()?.activity.propertyId ?? null,
    loader: ({ params }) =>
      params === null ? Promise.resolve(null) : this.api.communitySummary(params),
  });
  protected readonly summary = computed<CommunitySummaryView | null>(
    () => this.summaryResource.value() ?? null,
  );

  protected readonly canConfirmNow = computed(() => {
    const detail = this.detail();
    return detail !== null && canConfirm(detail.activity, this.participation(), new Date());
  });
  protected readonly canWithdrawNow = computed(() => canWithdraw(this.participation()));

  protected participationLabel(participant: ParticipantView): string {
    return PARTICIPATION_LABELS[participant.status];
  }

  protected retry(): void {
    this.detailResource.reload();
  }

  protected refresh(): void {
    this.detailResource.reload();
    this.summaryResource.reload();
  }

  protected async confirmAttendance(): Promise<void> {
    await this.run(
      'confirm',
      () => this.api.confirmAttendance(this.activityId()),
      'Asistencia confirmada.',
    );
  }

  protected async withdraw(): Promise<void> {
    await this.run(
      'withdraw',
      () => this.api.withdrawFromActivity(this.activityId()),
      'Te has retirado: la plaza vuelve a quedar libre.',
    );
  }

  private async run(
    action: 'confirm' | 'withdraw',
    call: () => Promise<ParticipantView>,
    success: string,
  ): Promise<void> {
    this.busyAction.set(action);
    this.actionError.set(null);
    this.successMessage.set(null);
    try {
      await call();
      this.successMessage.set(success);
      this.refresh();
    } catch (error) {
      const apiError = toApiError(error);
      this.actionError.set(this.describeError(apiError.status, apiError.code, apiError.message));
      if (apiError.status === 409 || apiError.status === 404) {
        this.refresh();
      }
    } finally {
      this.busyAction.set(null);
    }
  }

  private describeError(status: number, code: string, message: string): string {
    if (status === 409) {
      return `El servidor no aceptó la acción (${code}): ${message}. El estado se actualizó con lo que devuelve el backend.`;
    }
    if (status === 403) {
      return 'No formas parte de la comunidad autorizada de esta actividad.';
    }
    if (status === 404) {
      return 'La actividad ya no existe: actualizamos la información.';
    }
    return message;
  }
}
