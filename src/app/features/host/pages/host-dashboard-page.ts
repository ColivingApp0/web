import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { toApiError } from '../../../core/http/api-error';
import { UiAlert } from '../../../shared/ui/alert';
import { UiButton } from '../../../shared/ui/button';
import { HostApi } from '../data-access/host-api';
import { HostProperty } from '../models/host-models';
import { HostPropertyForm } from '../ui/property-form';

/** Panel del anfitrión: propiedades del usuario (GET /host/properties) con alta en línea. */
@Component({
  selector: 'app-host-dashboard-page',
  imports: [RouterLink, UiAlert, UiButton, HostPropertyForm],
  templateUrl: './host-dashboard-page.html',
})
export class HostDashboardPage {
  private readonly api = inject(HostApi);

  protected readonly loading = signal(true);
  protected readonly loadError = signal<string | null>(null);
  protected readonly properties = signal<readonly HostProperty[]>([]);
  protected readonly showCreate = signal(false);
  protected readonly success = signal<string | null>(null);

  constructor() {
    void this.load();
  }

  protected async load(): Promise<void> {
    this.loading.set(true);
    this.loadError.set(null);
    try {
      this.properties.set(await this.api.listProperties());
    } catch (error) {
      this.loadError.set(toApiError(error).message);
    } finally {
      this.loading.set(false);
    }
  }

  protected onCreated(property: HostProperty): void {
    this.properties.update((list) => [...list, property]);
    this.showCreate.set(false);
    this.success.set('Propiedad creada. Añade sus unidades para publicarlas.');
  }
}
