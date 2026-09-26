import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { toApiError } from '../../../core/http/api-error';
import { UiAlert } from '../../../shared/ui/alert';
import { UiButton } from '../../../shared/ui/button';
import { ListingsApi } from '../data-access/listings-api';
import { FavoritesStore } from '../state/favorites-store';

interface FavoriteRow {
  publicationId: string;
  createdAt: string;
  title: string | null;
  price: number | null;
  currency: string | null;
  unavailable: boolean;
}

/** Lista de favoritos guardados (RF-034) con estado de cada publicación. */
@Component({
  selector: 'app-favorites-page',
  imports: [RouterLink, CurrencyPipe, DatePipe, UiAlert, UiButton],
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
            return {
              publicationId: favorite.publicationId,
              createdAt: favorite.createdAt,
              title: detail.publication.title,
              price: detail.pricing?.basePricePerNight ?? null,
              currency: detail.pricing?.currency ?? null,
              unavailable: false,
            };
          } catch {
            // La publicación pudo pausarse/archivarse después de guardarla.
            return {
              publicationId: favorite.publicationId,
              createdAt: favorite.createdAt,
              title: null,
              price: null,
              currency: null,
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
