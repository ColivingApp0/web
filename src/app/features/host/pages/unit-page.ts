import { CurrencyPipe } from '@angular/common';
import { Component, computed, inject, resource, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toApiError } from '../../../core/http/api-error';
import { UiAlert } from '../../../shared/ui/alert';
import { UiButton } from '../../../shared/ui/button';
import { UiIcon } from '../../../shared/ui/icon';
import { placesLabel } from '../../../shared/utils/plural';
import { HostApi } from '../data-access/host-api';
import {
  HostUnit,
  PUBLICATION_STATUS_CLASSES,
  PUBLICATION_STATUS_LABELS,
  hostPriceUnitLabel,
} from '../models/host-models';
import { HostPhotoManager } from '../ui/photo-manager';
import { HostUnitForm } from '../ui/unit-form';

/** Ficha de una habitación: datos, fotos, precio y disponibilidad comercial. */
@Component({
  selector: 'app-host-unit-page',
  imports: [CurrencyPipe, RouterLink, UiAlert, UiButton, UiIcon, HostPhotoManager, HostUnitForm],
  templateUrl: './unit-page.html',
})
export class HostUnitPage {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(HostApi);
  private readonly params = toSignal(this.route.paramMap, { requireSync: true });

  protected readonly propertyId = computed(() => this.params().get('propertyId') ?? '');
  protected readonly unitId = computed(() => this.params().get('unitId') ?? '');

  protected readonly unitResource = resource({
    params: () => this.unitId(),
    loader: ({ params }) => this.api.unit(params),
  });

  protected readonly loading = computed(() => this.unitResource.isLoading());
  protected readonly loadError = computed(() => {
    const error = this.unitResource.error();
    if (!error) return null;
    const apiError = toApiError(error);
    return apiError.status === 404 || apiError.status === 403
      ? 'No encontramos esta habitación o no pertenece a tus propiedades.'
      : apiError.message;
  });
  protected readonly unit = computed<HostUnit | null>(() => this.unitResource.value() ?? null);

  protected readonly places = placesLabel;
  protected readonly success = signal<string | null>(null);
  protected readonly actionError = signal<string | null>(null);
  protected readonly availabilityBusy = signal(false);
  protected readonly photoBusy = signal(false);
  protected readonly photoError = signal<string | null>(null);

  protected readonly statusLabel = computed(() => {
    const status = this.unit()?.publication?.status;
    return status ? PUBLICATION_STATUS_LABELS[status] : 'Sin publicación';
  });
  protected readonly statusClasses = computed(() => {
    const status = this.unit()?.publication?.status;
    return status ? PUBLICATION_STATUS_CLASSES[status] : 'bg-soft text-muted border-line';
  });
  protected readonly canToggleAvailability = computed(() => {
    const status = this.unit()?.publication?.status;
    return (
      status === 'PUBLICADA' || status === 'PAUSADA' || status === 'BORRADOR' || status === 'OCULTA'
    );
  });
  protected readonly missingPrice = computed(() => this.unit()?.monthlyPrice == null);

  protected retry(): void {
    this.unitResource.reload();
  }

  protected onSaved(unit: HostUnit): void {
    this.success.set('Habitación guardada.');
    this.unitResource.reload();
    void unit;
  }

  protected priceUnit(unit: HostUnit): string {
    return hostPriceUnitLabel(unit.priceUnit);
  }

  protected async toggleAvailability(): Promise<void> {
    const unit = this.unit();
    if (!unit || this.availabilityBusy()) return;
    this.availabilityBusy.set(true);
    this.actionError.set(null);
    this.success.set(null);
    try {
      const enabled = !unit.published;
      await this.api.setUnitAvailability(unit.id, enabled);
      this.success.set(
        enabled
          ? 'Habitación habilitada: ya acepta solicitudes si tiene plazas libres.'
          : 'Habitación pausada: deja de aceptar solicitudes aunque tenga plazas libres.',
      );
      this.unitResource.reload();
    } catch (error) {
      const apiError = toApiError(error);
      this.actionError.set(
        apiError.code === 'CONFLICT'
          ? `${apiError.message}. Revisa el precio mensual y tu verificación de identidad.`
          : apiError.message,
      );
      this.unitResource.reload();
    } finally {
      this.availabilityBusy.set(false);
    }
  }

  protected async addPhoto(url: string): Promise<void> {
    const unit = this.unit();
    if (!unit) return;
    await this.runPhotoAction(() => this.api.addUnitPhoto(unit.id, url));
  }

  protected async deletePhoto(photoId: string): Promise<void> {
    const unit = this.unit();
    if (!unit) return;
    await this.runPhotoAction(() => this.api.deleteUnitPhoto(unit.id, photoId));
  }

  protected async reorderPhotos(photoIds: string[]): Promise<void> {
    const unit = this.unit();
    if (!unit) return;
    await this.runPhotoAction(() => this.api.reorderUnitPhotos(unit.id, photoIds));
  }

  private async runPhotoAction(action: () => Promise<HostUnit>): Promise<void> {
    this.photoBusy.set(true);
    this.photoError.set(null);
    try {
      await action();
      this.unitResource.reload();
    } catch (error) {
      this.photoError.set(toApiError(error).message);
    } finally {
      this.photoBusy.set(false);
    }
  }
}
