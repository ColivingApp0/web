import { CurrencyPipe } from '@angular/common';
import { Component, computed, inject, resource } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toApiError } from '../../../core/http/api-error';
import { UiAlert } from '../../../shared/ui/alert';
import { UiAvailabilityBadge } from '../ui/availability-badge';
import { UiAvatar } from '../../../shared/ui/avatar';
import { UiButton } from '../../../shared/ui/button';
import { UiEmptyState } from '../../../shared/ui/empty-state';
import { UiIcon } from '../../../shared/ui/icon';
import { ListingsApi } from '../data-access/listings-api';
import { bathroomLabel, priceUnitLabel, roomTypeLabel } from '../models/listings-models';
import { placesLabel, roomsLabel } from '../../../shared/utils/plural';

/** Detalle de una propiedad con sus habitaciones publicadas. */
@Component({
  selector: 'app-property-detail-page',
  imports: [
    CurrencyPipe,
    RouterLink,
    UiAlert,
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

  protected readonly detail = computed(() => this.propertyResource.value() ?? null);
  protected readonly loading = computed(() => this.propertyResource.isLoading());
  protected readonly errorMessage = computed(() => {
    const error = this.propertyResource.error();
    if (!error) return null;
    const apiError = toApiError(error);
    return apiError.code === 'NOT_FOUND'
      ? 'No encontramos esta propiedad o ya no tiene habitaciones publicadas.'
      : apiError.message;
  });

  protected readonly mainPhoto = computed(() => this.detail()?.property.photos[0]?.url ?? null);
  protected readonly extraPhotos = computed(() => this.detail()?.property.photos.slice(1, 5) ?? []);
  protected readonly location = computed(() => {
    const property = this.detail()?.property;
    if (!property) return '';
    return [property.neighborhood, property.cityName].filter(Boolean).join(', ');
  });

  protected readonly places = placesLabel;
  protected readonly rooms = roomsLabel;

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
