import { DecimalPipe } from '@angular/common';
import { Component, computed, inject, resource } from '@angular/core';
import { RouterLink } from '@angular/router';
import { toApiError } from '../../../core/http/api-error';
import { UiAlert } from '../../../shared/ui/alert';
import { UiButton } from '../../../shared/ui/button';
import { AdminApi } from '../data-access/admin-api';
import { ModerationMetricsView } from '../models/admin-models';

/**
 * Punto de entrada del área interna: indicadores **reales** de la cola
 * (RF-084 tiene en el backend solo métricas de casos) y acceso a las superficies
 * administrativas. No se inventan indicadores de negocio: RF-084 pide usuarios,
 * publicaciones, solicitudes y conversiones con filtros de periodo, y ese
 * contrato no existe (§15 de la guía).
 */
@Component({
  selector: 'app-admin-dashboard-page',
  imports: [RouterLink, DecimalPipe, UiAlert, UiButton],
  templateUrl: './admin-dashboard-page.html',
})
export class AdminDashboardPage {
  private readonly api = inject(AdminApi);

  protected readonly metricsResource = resource({ loader: () => this.api.metrics() });
  protected readonly metrics = computed<ModerationMetricsView | null>(
    () => this.metricsResource.value() ?? null,
  );
  protected readonly loading = computed(() => this.metricsResource.isLoading());
  protected readonly loadError = computed(() => {
    const error = this.metricsResource.error();
    return error ? toApiError(error).message : null;
  });

  protected retry(): void {
    this.metricsResource.reload();
  }
}
