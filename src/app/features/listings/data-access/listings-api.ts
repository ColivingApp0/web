import { HttpClient, HttpParams } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { API_BASE } from '../../../core/http/api-base';
import {
  DayAvailabilityView,
  FavoriteView,
  ListingView,
  PublicationDetailView,
  SearchFilters,
} from '../models/listings-models';

/** Lecturas públicas de alojamientos (search + accommodation) y favoritos (RF-030/033/034). */
@Service()
export class ListingsApi {
  private readonly http = inject(HttpClient);

  list(filters: SearchFilters): Promise<ListingView[]> {
    const query: Record<string, string> = {};
    if (filters.minPrice != null) query['minPrice'] = String(filters.minPrice);
    if (filters.maxPrice != null) query['maxPrice'] = String(filters.maxPrice);
    if (filters.currency) query['currency'] = filters.currency;
    if (filters.availableFrom) query['availableFrom'] = filters.availableFrom;
    if (filters.availableTo) query['availableTo'] = filters.availableTo;
    if (filters.sort) query['sort'] = filters.sort;
    if (filters.minNights != null) query['minNights'] = String(filters.minNights);
    return firstValueFrom(
      this.http.get<ListingView[]>(`${API_BASE}/search/listings`, {
        params: new HttpParams({ fromObject: query }),
      }),
    );
  }

  detail(publicationId: string): Promise<PublicationDetailView> {
    return firstValueFrom(
      this.http.get<PublicationDetailView>(`${API_BASE}/publications/${publicationId}`),
    );
  }

  availability(publicationId: string, from: string, to: string): Promise<DayAvailabilityView[]> {
    return firstValueFrom(
      this.http.get<DayAvailabilityView[]>(
        `${API_BASE}/publications/${publicationId}/availability`,
        {
          params: new HttpParams({ fromObject: { from, to } }),
        },
      ),
    );
  }

  listFavorites(): Promise<FavoriteView[]> {
    return firstValueFrom(this.http.get<FavoriteView[]>(`${API_BASE}/favorites`));
  }

  addFavorite(publicationId: string): Promise<FavoriteView> {
    return firstValueFrom(
      this.http.post<FavoriteView>(`${API_BASE}/favorites/${publicationId}`, null),
    );
  }

  removeFavorite(publicationId: string): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`${API_BASE}/favorites/${publicationId}`));
  }
}
