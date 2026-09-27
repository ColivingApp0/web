import { Component, computed, inject, linkedSignal, resource, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toApiError } from '../../../core/http/api-error';
import { UiAlert } from '../../../shared/ui/alert';
import { UiButton } from '../../../shared/ui/button';
import { HostApi } from '../data-access/host-api';
import { HostProperty, HostUnit } from '../models/host-models';
import { HostPropertyForm } from '../ui/property-form';
import { HostUnitForm } from '../ui/unit-form';

/**
 * Detalle de una propiedad con su edición y la gestión de sus unidades.
 * Nota de contrato: no hay GET de propiedad individual; se resuelve desde el
 * listado del anfitrión (documentado como limitación del backend).
 */
@Component({
  selector: 'app-host-property-page',
  imports: [RouterLink, UiAlert, UiButton, HostPropertyForm, HostUnitForm],
  templateUrl: './property-page.html',
})
export class HostPropertyPage {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(HostApi);

  private readonly params = toSignal(this.route.paramMap, { requireSync: true });
  protected readonly propertyId = computed(() => this.params().get('propertyId') ?? '');

  private readonly propertyResource = resource({
    params: () => this.propertyId(),
    loader: ({ params }) =>
      this.api
        .listProperties()
        .then((list) => list.find((property) => property.id === params) ?? null),
  });

  protected readonly loading = computed(() => this.propertyResource.isLoading());
  protected readonly loadError = computed(() => {
    const error = this.propertyResource.error();
    return error ? toApiError(error).message : null;
  });

  /** La propiedad también se actualiza localmente tras editarla. */
  protected readonly property = linkedSignal(() => this.propertyResource.value() ?? null);
  protected readonly notFound = computed(
    () => !this.loading() && this.loadError() === null && this.property() === null,
  );

  private readonly unitsResource = resource({
    params: () => this.property()?.id ?? null,
    loader: ({ params }) =>
      params === null ? Promise.resolve<HostUnit[]>([]) : this.api.listUnits(params),
  });

  protected readonly unitsLoading = computed(() => this.unitsResource.isLoading());
  protected readonly units = linkedSignal<readonly HostUnit[]>(
    () => this.unitsResource.value() ?? [],
  );
  protected readonly showCreateUnit = signal(false);
  protected readonly success = signal<string | null>(null);

  protected retry(): void {
    this.propertyResource.reload();
    this.unitsResource.reload();
  }

  protected onPropertySaved(updated: HostProperty): void {
    this.property.set(updated);
    this.success.set('Propiedad guardada.');
  }

  protected onUnitCreated(unit: HostUnit): void {
    this.units.update((list) => [...list, unit]);
    this.showCreateUnit.set(false);
    this.success.set(
      'Unidad creada. Abre su ficha para crear la publicación y gestionar la disponibilidad.',
    );
  }
}
