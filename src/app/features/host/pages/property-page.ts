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
import {
  freePlacesLabel,
  occupiedPlacesLabel,
  placesLabel,
  roomsLabel,
} from '../../../shared/utils/plural';
import {
  HostProperty,
  HostPropertyDetail,
  HostUnit,
  PUBLICATION_STATUS_LABELS,
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
  protected readonly occupiedPlaces = occupiedPlacesLabel;
  protected readonly freePlaces = freePlacesLabel;
  protected readonly roomsCount = roomsLabel;
  protected readonly showCreateUnit = signal(false);
  protected readonly success = signal<string | null>(null);
  protected readonly photoBusy = signal(false);
  protected readonly photoError = signal<string | null>(null);
  protected readonly pauseAllBusy = signal(false);
  protected readonly pauseAllError = signal<string | null>(null);
  protected readonly publishedRooms = computed(() => this.rooms().filter((room) => room.published));

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

  protected async pauseAllRooms(): Promise<void> {
    const rooms = this.publishedRooms();
    if (rooms.length === 0 || this.pauseAllBusy()) return;
    const confirmed = confirm(
      `Se pausarán ${rooms.length} ${rooms.length === 1 ? 'habitación publicada' : 'habitaciones publicadas'}. Dejarán de recibir solicitudes nuevas, pero conservarán su historial y podrás publicarlas de nuevo una a una. ¿Continuar?`,
    );
    if (!confirmed) return;
    this.pauseAllBusy.set(true);
    this.pauseAllError.set(null);
    this.success.set(null);
    try {
      await Promise.all(rooms.map((room) => this.api.setUnitAvailability(room.id, false)));
      this.success.set(
        'Habitaciones pausadas: la propiedad deja de aparecer en la búsqueda. El archivado completo de la propiedad todavía no está disponible.',
      );
      this.detailResource.reload();
    } catch (error) {
      this.pauseAllError.set(toApiError(error).message);
      this.detailResource.reload();
    } finally {
      this.pauseAllBusy.set(false);
    }
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

  protected roomStatusLabel(unit: HostUnit): string {
    const status = unit.publication?.status;
    if (!status) return 'Sin publicación';
    if (status === 'PUBLICADA') return PUBLICATION_STATUS_LABELS.PUBLICADA;
    return PUBLICATION_STATUS_LABELS[status];
  }

  protected roomStatusClasses(unit: HostUnit): string {
    const status = unit.publication?.status;
    if (status === 'PUBLICADA') return 'border-brand-200 bg-brand-50 text-brand-800';
    if (status === 'BORRADOR') return 'border-line bg-white/95 text-accent-600';
    return 'border-line bg-white/95 text-ink-soft';
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
