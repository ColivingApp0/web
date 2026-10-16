import { HttpClient, HttpParams } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { API_BASE } from '../../../core/http/api-base';
import {
  FavoriteView,
  ListingView,
  PropertyDetailView,
  PublicationDetailView,
  RoommateView,
  SearchFilters,
} from '../models/listings-models';

/** Lecturas públicas de habitaciones/propiedades y favoritos. */
@Service()
export class ListingsApi {
  private readonly http = inject(HttpClient);

  list(filters: SearchFilters): Promise<ListingView[]> {
    const query: Record<string, string> = {};
    if (filters.q) query['q'] = filters.q;
    if (filters.minPrice != null) query['minPrice'] = String(filters.minPrice);
    if (filters.maxPrice != null) query['maxPrice'] = String(filters.maxPrice);
    if (filters.currency) query['currency'] = filters.currency;
    if (filters.sort) query['sort'] = filters.sort;
    if (filters.minCapacity != null) query['minCapacity'] = String(filters.minCapacity);
    if (filters.availableOnly != null) query['availableOnly'] = String(filters.availableOnly);
    if (filters.airConditioning != null) query['airConditioning'] = String(filters.airConditioning);
    if (filters.fan != null) query['fan'] = String(filters.fan);
    if (filters.bathroomType) query['bathroomType'] = filters.bathroomType;
    if (filters.roomType) query['roomType'] = filters.roomType;
    if (filters.propertyId) query['propertyId'] = filters.propertyId;
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

  property(propertyId: string): Promise<PropertyDetailView> {
    return firstValueFrom(
      this.http.get<PropertyDetailView>(`${API_BASE}/properties/${propertyId}`),
    );
  }

  roommates(publicationId: string): Promise<RoommateView[]> {
    return firstValueFrom(
      this.http.get<RoommateView[]>(`${API_BASE}/publications/${publicationId}/roommates`),
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
