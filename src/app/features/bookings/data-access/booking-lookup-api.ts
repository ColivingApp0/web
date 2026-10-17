import { HttpClient } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { API_BASE } from '../../../core/http/api-base';
import {
  BookingContext,
  BookingCurrency,
  BookingPriceUnit,
  GuestUnitRef,
} from '../models/bookings-models';

/** Forma mínima que este contexto lee del detalle público de una habitación. */
interface PublicationDetailResponse {
  publication: { id: string; unitId: string; title: string; status: string };
  property: {
    title: string | null;
    cityName: string | null;
    neighborhood: string | null;
    photos: { url: string }[];
  };
  unit: {
    id: string;
    name: string;
    maxGuests: number;
    monthlyPrice: number | null;
    currency: BookingCurrency;
    priceUnit: BookingPriceUnit;
    photos: { url: string }[];
  };
  occupancy: {
    capacity: number;
    occupiedPlaces: number;
    availablePlaces: number;
    published: boolean;
    effectiveAvailable: boolean;
  };
}

/** Lecturas de apoyo del formulario de solicitud (proyección estrecha). */
@Service()
export class BookingLookupApi {
  private readonly http = inject(HttpClient);

  async bookingContext(publicationId: string): Promise<BookingContext> {
    const detail = await firstValueFrom(
      this.http.get<PublicationDetailResponse>(`${API_BASE}/publications/${publicationId}`),
    );
    return {
      publicationId: detail.publication.id,
      unitId: detail.unit.id,
      unitName: detail.unit.name,
      propertyTitle: detail.property.title,
      cityName: detail.property.cityName,
      neighborhood: detail.property.neighborhood,
      maxGuests: detail.unit.maxGuests,
      occupiedPlaces: detail.occupancy.occupiedPlaces,
      availablePlaces: detail.occupancy.availablePlaces,
      monthlyPrice: detail.unit.monthlyPrice ?? 0,
      currency: detail.unit.currency,
      priceUnit: detail.unit.priceUnit,
      photoUrl: detail.unit.photos[0]?.url ?? detail.property.photos[0]?.url ?? null,
      published: detail.occupancy.published,
      effectiveAvailable: detail.occupancy.effectiveAvailable,
    };
  }

  async hostUnits(): Promise<GuestUnitRef[]> {
    const properties = await firstValueFrom(
      this.http.get<{ id: string }[]>(`${API_BASE}/host/properties`),
    );
    const unitsPerProperty = await Promise.all(
      properties.map(async (property) => {
        const units = await firstValueFrom(
          this.http.get<{ id: string; name: string }[]>(
            `${API_BASE}/host/properties/${property.id}/units`,
          ),
        );
        return units.map((unit) => ({ unitId: unit.id, name: unit.name, propertyId: property.id }));
      }),
    );
    return unitsPerProperty.flat();
  }
}
