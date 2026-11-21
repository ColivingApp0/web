import { CurrencyPipe } from '@angular/common';
import { Component, computed, inject, resource } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toApiError } from '../../../core/http/api-error';
import { UiAvailabilityBadge } from '../ui/availability-badge';
import { UiAvatar } from '../../../shared/ui/avatar';
import { UiButton } from '../../../shared/ui/button';
import { UiEmptyState } from '../../../shared/ui/empty-state';
import { UiIcon } from '../../../shared/ui/icon';
import { ListingsApi } from '../data-access/listings-api';
import { bathroomLabel, priceUnitLabel, roomTypeLabel } from '../models/listings-models';
import { placesLabel, publishedRoomsLabel } from '../../../shared/utils/plural';
import { amenityIcon } from '../../../shared/utils/amenity-icon';
import { canonicalCityName } from '../../directory/models/directory-models';

/** Detalle de una propiedad con sus habitaciones publicadas. */
@Component({
  selector: 'app-property-detail-page',
  imports: [
    CurrencyPipe,
    RouterLink,
    UiAvailabilityBadge,
    UiAvatar,
    UiButton,
    UiEmptyState,
    UiIcon,
  ],
  templateUrl: './property-detail-page.html',
})
export class PropertyDetailPage {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(ListingsApi);
  private readonly params = toSignal(this.route.paramMap, { requireSync: true });

  protected readonly propertyId = computed(() => this.params().get('id') ?? '');

  protected readonly propertyResource = resource({
    params: () => this.propertyId(),
    loader: ({ params }) => this.api.property(params),
  });

  protected readonly detail = computed(() =>
    this.propertyResource.hasValue() ? this.propertyResource.value() : null,
  );
  protected readonly loading = computed(() => {
    const status = this.propertyResource.status();
    return status === 'loading' || status === 'reloading' || status === 'idle';
  });
  protected readonly notFound = computed(() => {
    const error = this.propertyResource.error();
    if (!error) return false;
    const { status } = toApiError(error);
    return status === 404 || status === 400;
  });
  protected readonly errorMessage = computed(() => {
    const error = this.propertyResource.error();
    if (!error) return null;
    const apiError = toApiError(error);
    if (apiError.status === 404 || apiError.status === 400) {
      return 'Puede haberse archivado o no existir. Revisa el enlace o vuelve a la búsqueda.';
    }
    if (apiError.status === 0) {
      return 'No pudimos conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.';
    }
    return 'No pudimos cargar esta propiedad en este momento. Vuelve a intentarlo en unos segundos.';
  });

  protected readonly mainPhoto = computed(() => this.detail()?.property.photos[0]?.url ?? null);
  protected readonly extraPhotos = computed(() => this.detail()?.property.photos.slice(1, 5) ?? []);
  protected readonly location = computed(() => {
    const property = this.detail()?.property;
    if (!property) return '';
    return [property.neighborhood, canonicalCityName(property.cityName ?? '')]
      .filter(Boolean)
      .join(', ');
  });

  protected readonly places = placesLabel;
  protected readonly publishedRooms = publishedRoomsLabel;
  protected readonly amenityIcon = amenityIcon;

  protected priceUnit(unit: 'POR_HABITACION' | 'POR_PERSONA'): string {
    return priceUnitLabel(unit);
  }

  protected roomType(unit: 'INDIVIDUAL' | 'COMPARTIDA'): string {
    return roomTypeLabel(unit);
  }

  protected bathroom(unit: 'PRIVADO' | 'COMPARTIDO'): string {
    return bathroomLabel(unit);
  }

  protected retry(): void {
    this.propertyResource.reload();
  }
}
