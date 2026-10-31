import { HttpClient } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { API_BASE } from '../../../core/http/api-base';
import {
  HostPropertyRef,
  HostReservationRef,
  HostUnitRef,
  residentCandidates,
  ResidentCandidate,
} from '../models/community-models';

/** Forma mínima que esta feature lee de los endpoints del anfitrión. */
interface HostPropertyResponse {
  id: string;
  title: string | null;
}
interface HostUnitResponse {
  id: string;
  name: string;
}
interface HostReservationResponse {
  id: string;
  unitId: string;
  guestUserId: string;
  status: string;
  monthlyPrice: number | null;
  currency: string;
}

/** Contexto del anfitrión necesario para crear actividades (proyección estrecha). */
export interface HostCommunityContext {
  properties: HostPropertyRef[];
  units: HostUnitRef[];
  reservations: HostReservationRef[];
}

/**
 * Proyección de lectura **de la feature** (ADR-006) para poder cumplir RF-060:
 * no existe endpoint que liste los residentes de una propiedad, así que se
 * derivan de los datos propios del anfitrión (`/host/properties`,
 * `/host/properties/{id}/units` y `/host/reservations`), replicando la regla del
 * backend (huéspedes con reserva `CONFIRMADA` sobre las unidades de la
 * propiedad). El backend sigue siendo la autoridad: valida la pertenencia al
 * crear la actividad y responde 400 si alguien no pertenece.
 */
@Service()
export class CommunityResidentsApi {
  private readonly http = inject(HttpClient);

  async hostContext(): Promise<HostCommunityContext> {
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
    const reservations = await firstValueFrom(
      this.http.get<HostReservationResponse[]>(`${API_BASE}/host/reservations`),
    );
    return {
      properties: properties.map((property) => ({ id: property.id, title: property.title })),
      units: unitsPerProperty.flat(),
      reservations: reservations.map((reservation) => ({
        id: reservation.id,
        unitId: reservation.unitId,
        guestUserId: reservation.guestUserId,
        status: reservation.status,
        monthlyPrice: reservation.monthlyPrice,
        currency: reservation.currency,
      })),
    };
  }

  /** Residentes habilitables de una propiedad, derivados del contexto anterior. */
  residentsOf(context: HostCommunityContext, propertyId: string): ResidentCandidate[] {
    return residentCandidates(propertyId, context.units, context.reservations);
  }
}
