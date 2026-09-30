import { Component, computed, inject, resource } from '@angular/core';
import { RouterLink } from '@angular/router';
import { toApiError } from '../../../core/http/api-error';
import { UiAlert } from '../../../shared/ui/alert';
import { UiButton } from '../../../shared/ui/button';
import { CommunityApi } from '../data-access/community-api';
import { ActivityView, activityPhase } from '../models/community-models';
import { ActivityCard } from '../ui/activity-card';

/**
 * «Mi comunidad» (RF-060/RF-061, vista del residente): actividades en las que el
 * anfitrión **habilitó** al usuario. El estado mostrado es el real; confirmar y
 * retirarse se hacen en el detalle, donde también se ven los participantes.
 *
 * Sin store: un `resource()` por página; el listado se recarga al volver.
 */
@Component({
  selector: 'app-my-activities-page',
  imports: [RouterLink, UiAlert, UiButton, ActivityCard],
  templateUrl: './my-activities-page.html',
})
export class MyActivitiesPage {
  private readonly api = inject(CommunityApi);

  protected readonly listResource = resource({ loader: () => this.api.listMyActivities() });
  protected readonly activities = computed(() => this.listResource.value() ?? []);
  protected readonly loading = computed(() => this.listResource.isLoading());
  protected readonly loadError = computed(() => {
    const error = this.listResource.error();
    return error ? toApiError(error).message : null;
  });

  protected phaseOf(activity: ActivityView): string {
    return activityPhase(activity, new Date());
  }

  protected retry(): void {
    this.listResource.reload();
  }
}
