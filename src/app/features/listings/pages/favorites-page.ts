import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { toApiError } from '../../../core/http/api-error';
import { UiAlert } from '../../../shared/ui/alert';
import { UiButton } from '../../../shared/ui/button';
import { ListingsApi } from '../data-access/listings-api';
import { ListingView } from '../models/listings-models';
import { FavoritesStore } from '../state/favorites-store';
import { ListingCard } from '../ui/listing-card';

interface FavoriteRow {
  publicationId: string;
  createdAt: string;
  listing: ListingView | null;
  unavailable: boolean;
}

/** Lista de favoritos guardados (RF-034) con estado de cada publicación. */
@Component({
  selector: 'app-favorites-page',
  imports: [RouterLink, DatePipe, UiAlert, UiButton, ListingCard],
  templateUrl: './favorites-page.html',
})
export class FavoritesPage {
  private readonly api = inject(ListingsApi);
  protected readonly favorites = inject(FavoritesStore);

  protected readonly loading = signal(true);
  protected readonly loadError = signal<string | null>(null);
  protected readonly rows = signal<readonly FavoriteRow[]>([]);

  constructor() {
    void this.load();
  }

  protected async load(): Promise<void> {
    this.loading.set(true);
    this.loadError.set(null);
    try {
      const favorites = await this.api.listFavorites();
      const rows = await Promise.all(
        favorites.map(async (favorite): Promise<FavoriteRow> => {
          try {
            const detail = await this.api.detail(favorite.publicationId);
            const listing: ListingView = {
              publicationId: detail.publication.id,
              unitId: detail.unit.id,
              propertyId: detail.property.id,
              roomTitle: detail.unit.name,
              propertyTitle: detail.property.title ?? 'Propiedad',
              description: detail.unit.description,
              cityId: detail.property.cityId,
              cityName: detail.property.cityName,
              neighborhood: detail.property.neighborhood,
              monthlyPrice: detail.unit.monthlyPrice,
              currency: detail.unit.currency,
              priceUnit: detail.unit.priceUnit,
              roomType: detail.unit.roomType,
              bathroomType: detail.unit.bathroomType,
              airConditioning: detail.unit.airConditioning,
              fan: detail.unit.fan,
              capacity: detail.occupancy.capacity,
              occupiedPlaces: detail.occupancy.occupiedPlaces,
              availablePlaces: detail.occupancy.availablePlaces,
              photoUrl: detail.unit.photos[0]?.url ?? null,
              propertyPhotoUrl: detail.property.photos[0]?.url ?? null,
              serviceCodes: detail.publication.services,
              accessibilityCodes: detail.unit.accessibilityCodes,
              available: detail.occupancy.effectiveAvailable,
              availabilityLabel: detail.occupancy.label,
            };
            return {
              publicationId: favorite.publicationId,
              createdAt: favorite.createdAt,
              listing,
              unavailable: false,
            };
          } catch {
            // La publicación pudo pausarse/archivarse después de guardarla.
            return {
              publicationId: favorite.publicationId,
              createdAt: favorite.createdAt,
              listing: null,
              unavailable: true,
            };
          }
        }),
      );
      this.rows.set(rows);
      await this.favorites.load();
    } catch (error) {
      this.loadError.set(toApiError(error).message);
    } finally {
      this.loading.set(false);
    }
  }

  protected async remove(row: FavoriteRow): Promise<void> {
    await this.favorites.toggle(row.publicationId);
    if (!this.favorites.isFavorite(row.publicationId)) {
      this.rows.update((rows) => rows.filter((item) => item.publicationId !== row.publicationId));
    }
  }
}
