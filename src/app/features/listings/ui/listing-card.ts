import { CurrencyPipe } from '@angular/common';
import { Component, computed, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Currency, ListingView } from '../models/listings-models';

/** Tarjeta de un resultado real de búsqueda (presentacional; el estado de favorito llega por inputs). */
@Component({
  selector: 'app-listing-card',
  imports: [CurrencyPipe, RouterLink],
  templateUrl: './listing-card.html',
})
export class ListingCard {
  readonly listing = input.required<ListingView>();
  readonly favorite = input(false);
  readonly favoritePending = input(false);
  readonly favoriteToggle = output<string>();

  protected readonly price = computed<{ value: number; currency: Currency } | null>(() => {
    const { pricePerNight, currency } = this.listing();
    return pricePerNight !== null && currency !== null ? { value: pricePerNight, currency } : null;
  });
}
