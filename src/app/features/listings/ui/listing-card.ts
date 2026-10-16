import { CurrencyPipe } from '@angular/common';
import { Component, computed, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { UiAvailabilityBadge } from './availability-badge';
import { UiIcon } from '../../../shared/ui/icon';
import { ListingView, bathroomLabel, priceUnitLabel } from '../models/listings-models';

/** Tarjeta de una habitación publicada, con foto, precio mensual y plazas. */
@Component({
  selector: 'app-listing-card',
  imports: [CurrencyPipe, RouterLink, UiAvailabilityBadge, UiIcon],
  templateUrl: './listing-card.html',
})
export class ListingCard {
  readonly listing = input.required<ListingView>();
  readonly favorite = input(false);
  readonly favoritePending = input(false);
  readonly favoriteToggle = output<string>();

  protected readonly photo = computed(
    () => this.listing().photoUrl ?? this.listing().propertyPhotoUrl,
  );
  protected readonly location = computed(() => {
    const listing = this.listing();
    return [listing.neighborhood, listing.cityName].filter(Boolean).join(', ');
  });
  protected readonly priceUnit = computed(() => priceUnitLabel(this.listing().priceUnit));
  protected readonly bathroom = computed(() => bathroomLabel(this.listing().bathroomType));
  protected readonly capacityLabel = computed(() => {
    const listing = this.listing();
    return listing.roomType === 'COMPARTIDA'
      ? `${listing.capacity} plazas en total`
      : 'Para una persona';
  });
}
