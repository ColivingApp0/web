import { Component, computed, inject, linkedSignal, resource, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toApiError } from '../../../core/http/api-error';
import { UiAlert } from '../../../shared/ui/alert';
import { UiButton } from '../../../shared/ui/button';
import { HostApi } from '../data-access/host-api';
import { HostPublication, HostUnit } from '../models/host-models';
import { HostPublicationsStore } from '../state/host-publications-store';
import { HostBlocksForm } from '../ui/blocks-form';
import { HostPricingForm } from '../ui/pricing-form';
import { HostPublicationPanel } from '../ui/publication-panel';
import { HostRulesForm } from '../ui/rules-form';
import { HostUnitForm } from '../ui/unit-form';

/**
 * Ficha de una unidad: edición, ciclo de vida de la publicación (crear,
 * publicar/pausar/ocultar/revisión/archivar), precio, reglas y bloqueos.
 * La unidad se resuelve desde las unidades de su propiedad (sin GET individual).
 */
@Component({
  selector: 'app-host-unit-page',
  imports: [
    RouterLink,
    UiAlert,
    UiButton,
    HostUnitForm,
    HostPublicationPanel,
    HostPricingForm,
    HostRulesForm,
    HostBlocksForm,
  ],
  templateUrl: './unit-page.html',
})
export class HostUnitPage {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(HostApi);
  private readonly publications = inject(HostPublicationsStore);

  private readonly params = toSignal(this.route.paramMap, { requireSync: true });
  protected readonly propertyId = computed(() => this.params().get('propertyId') ?? '');
  protected readonly unitId = computed(() => this.params().get('unitId') ?? '');

  private readonly unitResource = resource({
    params: () => ({ propertyId: this.propertyId(), unitId: this.unitId() }),
    loader: ({ params }) =>
      this.api
        .listUnits(params.propertyId)
        .then((units) => units.find((unit) => unit.id === params.unitId) ?? null),
  });

  protected readonly loading = computed(() => this.unitResource.isLoading());
  protected readonly loadError = computed(() => {
    const error = this.unitResource.error();
    return error ? toApiError(error).message : null;
  });

  protected readonly unit = linkedSignal(() => this.unitResource.value() ?? null);
  protected readonly notFound = computed(
    () => !this.loading() && this.loadError() === null && this.unit() === null,
  );

  /** Publicación conocida de esta unidad (creada o actualizada durante la sesión de navegación). */
  protected readonly publication = computed(() => this.publications.findByUnit(this.unitId()));

  protected readonly success = signal<string | null>(null);

  protected retry(): void {
    this.unitResource.reload();
  }

  protected onUnitSaved(updated: HostUnit): void {
    this.unit.set(updated);
    this.success.set('Unidad guardada.');
  }

  protected onPublicationCreated(publication: HostPublication): void {
    this.publications.remember(publication);
    this.success.set(
      'Publicación creada en borrador. Define precio y reglas, y publícala cuando esté lista.',
    );
  }

  protected onPublicationChanged(publication: HostPublication): void {
    this.publications.remember(publication);
    this.success.set('Estado de la publicación actualizado.');
  }
}
