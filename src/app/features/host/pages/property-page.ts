import { CurrencyPipe } from '@angular/common';
import { Component, computed, inject, resource, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toApiError } from '../../../core/http/api-error';
import { UiAlert } from '../../../shared/ui/alert';
import { UiButton } from '../../../shared/ui/button';
import { UiEmptyState } from '../../../shared/ui/empty-state';
import { UiIcon } from '../../../shared/ui/icon';
import { UiPageHeader } from '../../../shared/ui/page-header';
import { HostApi } from '../data-access/host-api';
import { placesLabel, roomsLabel } from '../../../shared/utils/plural';
import {
  HostProperty,
  HostPropertyDetail,
  HostUnit,
  hostPriceUnitLabel,
} from '../models/host-models';
import { HostPhotoManager } from '../ui/photo-manager';
import { HostPropertyForm } from '../ui/property-form';
import { HostUnitForm } from '../ui/unit-form';

/** Detalle de una propiedad: datos generales, fotos y habitaciones. */
@Component({
  selector: 'app-host-property-page',
  imports: [
    CurrencyPipe,
    RouterLink,
    UiAlert,
    UiButton,
    UiEmptyState,
    UiIcon,
    UiPageHeader,
    HostPhotoManager,
    HostPropertyForm,
    HostUnitForm,
  ],
  templateUrl: './property-page.html',
})
export class HostPropertyPage {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(HostApi);
  private readonly params = toSignal(this.route.paramMap, { requireSync: true });

  protected readonly propertyId = computed(() => this.params().get('propertyId') ?? '');

  protected readonly detailResource = resource({
    params: () => this.propertyId(),
    loader: ({ params }) => this.api.propertyDetail(params),
  });

  protected readonly loading = computed(() => this.detailResource.isLoading());
  protected readonly loadError = computed(() => {
    const error = this.detailResource.error();
    if (!error) return null;
    const apiError = toApiError(error);
    return apiError.status === 404 || apiError.status === 403
      ? 'No encontramos esta propiedad o no es tuya.'
      : apiError.message;
  });
  protected readonly detail = computed<HostPropertyDetail | null>(
    () => this.detailResource.value() ?? null,
  );
  protected readonly property = computed<HostProperty | null>(
    () => this.detail()?.property ?? null,
  );
  protected readonly rooms = computed<HostUnit[]>(() => this.detail()?.rooms ?? []);

  protected readonly places = placesLabel;
  protected readonly roomsCount = roomsLabel;
  protected readonly showCreateUnit = signal(false);
  protected readonly success = signal<string | null>(null);
  protected readonly photoBusy = signal(false);
  protected readonly photoError = signal<string | null>(null);

  protected retry(): void {
    this.detailResource.reload();
  }

  protected onPropertySaved(property: HostProperty): void {
    this.success.set('Propiedad guardada.');
    this.detailResource.reload();
  }

  protected onUnitCreated(unit: HostUnit): void {
    this.showCreateUnit.set(false);
    this.success.set(
      'Habitación creada en borrador. Añade fotos, revisa el precio mensual y publícala para recibir solicitudes.',
    );
    this.detailResource.reload();
    void unit;
  }

  protected location(property: HostProperty): string {
    return [property.neighborhood, property.cityName].filter(Boolean).join(', ');
  }

  protected priceUnit(unit: HostUnit): string {
    return hostPriceUnitLabel(unit.priceUnit);
  }

  protected cover(unit: HostUnit): string | null {
    return unit.photos[0]?.url ?? null;
  }

  protected async addPhoto(url: string): Promise<void> {
    const property = this.property();
    if (!property) return;
    await this.runPhotoAction(() => this.api.addPropertyPhoto(property.id, url));
  }

  protected async deletePhoto(photoId: string): Promise<void> {
    const property = this.property();
    if (!property) return;
    await this.runPhotoAction(() => this.api.deletePropertyPhoto(property.id, photoId));
  }

  protected async reorderPhotos(photoIds: string[]): Promise<void> {
    const property = this.property();
    if (!property) return;
    await this.runPhotoAction(() => this.api.reorderPropertyPhotos(property.id, photoIds));
  }

  private async runPhotoAction(action: () => Promise<HostProperty>): Promise<void> {
    this.photoBusy.set(true);
    this.photoError.set(null);
    try {
      await action();
      this.detailResource.reload();
    } catch (error) {
      this.photoError.set(toApiError(error).message);
    } finally {
      this.photoBusy.set(false);
    }
  }
}
