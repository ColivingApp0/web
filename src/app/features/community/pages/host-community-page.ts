import { Component, computed, inject, resource, signal } from '@angular/core';
import { toApiError } from '../../../core/http/api-error';
import { UiAlert } from '../../../shared/ui/alert';
import { UiButton } from '../../../shared/ui/button';
import { UiFormField } from '../../../shared/ui/form-field';
import { CommunityApi } from '../data-access/community-api';
import { CommunityResidentsApi } from '../data-access/community-residents-api';
import {
  ActivityDetailView,
  ActivityView,
  CommunitySummaryView,
  PARTICIPATION_LABELS,
} from '../models/community-models';
import { ActivityCard } from '../ui/activity-card';
import { CreateActivityForm } from '../ui/create-activity-form';

/**
 * Gestión de la comunidad del anfitrión (RF-060): actividades de sus propiedades
 * (listado, alta, detalle con participantes y cancelación) y el **resumen
 * agregado** por propiedad (RF-062, solo contadores y gated por consentimiento).
 *
 * Los residentes habilitables se derivan de los datos propios del anfitrión
 * (`CommunityResidentsApi`, proyección estrecha); el backend valida igualmente la
 * pertenencia al crear la actividad.
 */
@Component({
  selector: 'app-host-community-page',
  imports: [UiAlert, UiButton, UiFormField, ActivityCard, CreateActivityForm],
  templateUrl: './host-community-page.html',
})
export class HostCommunityPage {
  private readonly api = inject(CommunityApi);
  private readonly residentsApi = inject(CommunityResidentsApi);

  protected readonly listResource = resource({ loader: () => this.api.listHostActivities() });
  protected readonly activities = computed(() => this.listResource.value() ?? []);
  protected readonly loading = computed(() => this.listResource.isLoading());
  protected readonly loadError = computed(() => {
    const error = this.listResource.error();
    return error ? toApiError(error).message : null;
  });

  private readonly contextResource = resource({
    loader: () => this.residentsApi.hostContext(),
  });
  protected readonly context = computed(() => this.contextResource.value() ?? null);
  protected readonly properties = computed(() => this.context()?.properties ?? []);
  protected readonly units = computed(() => this.context()?.units ?? []);
  protected readonly reservations = computed(() => this.context()?.reservations ?? []);
  protected readonly contextLoading = computed(() => this.contextResource.isLoading());
  protected readonly contextError = computed(() => {
    const error = this.contextResource.error();
    return error ? toApiError(error).message : null;
  });

  protected readonly showCreate = signal(false);
  protected readonly successMessage = signal<string | null>(null);
  protected readonly actionError = signal<string | null>(null);
  protected readonly busyActivityId = signal<string | null>(null);
  protected readonly participationLabels = PARTICIPATION_LABELS;

  private readonly details = signal<Record<string, ActivityDetailView>>({});
  private readonly detailsLoading = signal<Record<string, boolean>>({});

  // ---------- Resumen por propiedad (RF-062) ----------

  protected readonly summaryPropertyId = signal('');
  protected readonly summaryResource = resource<CommunitySummaryView | null, string | null>({
    params: () => (this.summaryPropertyId() === '' ? null : this.summaryPropertyId()),
    loader: ({ params }) =>
      params === null ? Promise.resolve(null) : this.api.communitySummary(params),
  });
  protected readonly summary = computed(() => this.summaryResource.value() ?? null);

  protected onSummaryPropertyChange(event: Event): void {
    const target = event.target;
    if (target instanceof HTMLSelectElement) {
      this.summaryPropertyId.set(target.value);
    }
  }

  protected detailOf(activityId: string): ActivityDetailView | null {
    return this.details()[activityId] ?? null;
  }

  protected detailLoading(activityId: string): boolean {
    return this.detailsLoading()[activityId] === true;
  }

  protected toggleCreate(): void {
    this.successMessage.set(null);
    this.showCreate.update((visible) => !visible);
  }

  protected onCreated(created: ActivityDetailView): void {
    this.showCreate.set(false);
    this.successMessage.set(
      `Actividad «${created.activity.title}» creada para ${created.participants.length} residente(s).`,
    );
    this.listResource.reload();
  }

  protected retry(): void {
    this.listResource.reload();
    this.contextResource.reload();
  }

  /** Detalle del anfitrión (incluye la lista completa de participantes). */
  protected async toggleDetail(activity: ActivityView): Promise<void> {
    if (this.details()[activity.id] !== undefined) {
      this.details.update((current) => {
        const copy = { ...current };
        delete copy[activity.id];
        return copy;
      });
      return;
    }
    this.markDetailLoading(activity.id, true);
    try {
      const detail = await this.api.hostActivityDetail(activity.id);
      this.details.update((current) => ({ ...current, [activity.id]: detail }));
    } catch (error) {
      const apiError = toApiError(error);
      this.actionError.set(
        apiError.status === 403
          ? 'No eres el anfitrión de esa actividad.'
          : apiError.status === 404
            ? 'La actividad ya no existe: actualizamos la lista.'
            : apiError.message,
      );
      if (apiError.status === 404) {
        this.listResource.reload();
      }
    } finally {
      this.markDetailLoading(activity.id, false);
    }
  }

  protected async cancel(activity: ActivityView): Promise<void> {
    this.busyActivityId.set(activity.id);
    this.actionError.set(null);
    this.successMessage.set(null);
    try {
      await this.api.cancelActivity(activity.id);
      this.successMessage.set('Actividad cancelada: ya no admite confirmaciones.');
      this.listResource.reload();
    } catch (error) {
      const apiError = toApiError(error);
      this.actionError.set(
        apiError.status === 409
          ? `El servidor no canceló la actividad (${apiError.code}): ${apiError.message}.`
          : apiError.status === 403
            ? 'Solo el anfitrión de la propiedad gestiona sus actividades.'
            : apiError.message,
      );
      if (apiError.status === 409 || apiError.status === 404) {
        this.listResource.reload();
      }
    } finally {
      this.busyActivityId.set(null);
    }
  }

  private markDetailLoading(activityId: string, value: boolean): void {
    this.detailsLoading.update((current) => ({ ...current, [activityId]: value }));
  }
}
