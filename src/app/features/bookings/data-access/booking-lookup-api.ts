import { HttpClient } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { API_BASE } from '../../../core/http/api-base';
import {
  BookingCancellationPolicy,
  BookingContext,
  BookingCurrency,
  HostUnitRef,
} from '../models/bookings-models';

/** Forma mínima que este contexto lee de `GET /publications/{id}`. */
interface PublicationDetailResponse {
  publication: { id: string; unitId: string; title: string; status: string };
  property: { id: string; title: string | null; address: string | null };
  unit: { id: string; name: string; maxGuests: number };
  pricing: { basePricePerNight: number; currency: BookingCurrency } | null;
  rules: {
    cancellationPolicy: BookingCancellationPolicy;
    minNights: number;
    maxNights: number;
  } | null;
}

/** Forma mínima que este contexto lee de `GET /host/properties[/{id}/units]`. */
interface HostPropertyResponse {
  id: string;
  title: string | null;
}
interface HostUnitResponse {
  id: string;
  name: string;
}

/**
 * Lecturas de apoyo del contexto `booking`, deliberadamente **estrechas**:
 *
 * - `bookingContext`: la foto de la publicación que el formulario de solicitud
 *   necesita (capacidad, precio vigente, política, estancias). Es una vista
 *   pública del alojamiento que el huésped está solicitando, no un acceso a la
 *   gestión interna del anfitrión.
 * - `hostUnits`: índice `unitId → nombre` para la bandeja del anfitrión, usando
 *   los endpoints **propios del anfitrión** (nunca rutas públicas para
 *   reconstruir publicaciones: ver ADR-005 y su deuda documentada).
 *
 * Si un tercer consumidor necesita estos contratos, se promueve un modelo
 * transversal; hoy solo `bookings` los usa.
 */
@Service()
export class BookingLookupApi {
  private readonly http = inject(HttpClient);

  async bookingContext(publicationId: string): Promise<BookingContext> {
    const detail = await firstValueFrom(
      this.http.get<PublicationDetailResponse>(`${API_BASE}/publications/${publicationId}`),
    );
    const pricing = detail.pricing;
    return {
      publicationId: detail.publication.id,
      unitId: detail.unit.id,
      unitName: detail.unit.name,
      propertyTitle: detail.property.title,
      propertyAddress: detail.property.address,
      maxGuests: detail.unit.maxGuests,
      // El backend exige pricing para poder reservar (`UnitBookingQuery`); un
      // valor 0 aquí solo alimenta la previsualización y se anota en la UI.
      pricePerNight: pricing?.basePricePerNight ?? 0,
      currency: pricing?.currency ?? 'COP',
      cancellationPolicy: detail.rules?.cancellationPolicy ?? null,
      minNights: detail.rules?.minNights ?? null,
      maxNights: detail.rules?.maxNights ?? null,
    };
  }

  async hostUnits(): Promise<HostUnitRef[]> {
    const properties = await firstValueFrom(
      this.http.get<HostPropertyResponse[]>(`${API_BASE}/host/properties`),
    );
    const unitsPerProperty = await Promise.all(
      properties.map(async (property) => {
        const units = await firstValueFrom(
          this.http.get<HostUnitResponse[]>(`${API_BASE}/host/properties/${property.id}/units`),
        );
        return units.map((unit) => ({ unitId: unit.id, name: unit.name, propertyId: property.id }));
      }),
    );
    return unitsPerProperty.flat();
  }
}
