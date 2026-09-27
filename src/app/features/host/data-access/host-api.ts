import { HttpClient, HttpParams } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { API_BASE } from '../../../core/http/api-base';
import {
  CreatePropertyPayload,
  CreateUnitPayload,
  HostDayAvailability,
  HostPricing,
  HostProperty,
  HostPublication,
  HostPublicationAction,
  HostRules,
  HostUnit,
  PricingPayload,
  RulesPayload,
  UpdatePropertyPayload,
  UpdateUnitPayload,
} from '../models/host-models';

/** Endpoints del anfitrión (`/api/v1/host/**`); permisos y gates los aplica el backend. */
@Service()
export class HostApi {
  private readonly http = inject(HttpClient);

  listProperties(): Promise<HostProperty[]> {
    return firstValueFrom(this.http.get<HostProperty[]>(`${API_BASE}/host/properties`));
  }

  createProperty(payload: CreatePropertyPayload): Promise<HostProperty> {
    return firstValueFrom(this.http.post<HostProperty>(`${API_BASE}/host/properties`, payload));
  }

  updateProperty(propertyId: string, payload: UpdatePropertyPayload): Promise<HostProperty> {
    return firstValueFrom(
      this.http.patch<HostProperty>(`${API_BASE}/host/properties/${propertyId}`, payload),
    );
  }

  listUnits(propertyId: string): Promise<HostUnit[]> {
    return firstValueFrom(
      this.http.get<HostUnit[]>(`${API_BASE}/host/properties/${propertyId}/units`),
    );
  }

  createUnit(propertyId: string, payload: CreateUnitPayload): Promise<HostUnit> {
    return firstValueFrom(
      this.http.post<HostUnit>(`${API_BASE}/host/properties/${propertyId}/units`, payload),
    );
  }

  updateUnit(unitId: string, payload: UpdateUnitPayload): Promise<HostUnit> {
    return firstValueFrom(this.http.patch<HostUnit>(`${API_BASE}/host/units/${unitId}`, payload));
  }

  createPublication(unitId: string, title: string): Promise<HostPublication> {
    return firstValueFrom(
      this.http.post<HostPublication>(`${API_BASE}/host/units/${unitId}/publication`, {
        title,
        services: [],
        applicableRuleCodes: [],
      }),
    );
  }

  runPublicationAction(
    publicationId: string,
    action: HostPublicationAction,
  ): Promise<HostPublication> {
    return firstValueFrom(
      this.http.post<HostPublication>(
        `${API_BASE}/host/publications/${publicationId}/${action}`,
        null,
      ),
    );
  }

  configurePricing(publicationId: string, payload: PricingPayload): Promise<HostPricing> {
    return firstValueFrom(
      this.http.put<HostPricing>(`${API_BASE}/host/publications/${publicationId}/pricing`, payload),
    );
  }

  configureRules(publicationId: string, payload: RulesPayload): Promise<HostRules> {
    return firstValueFrom(
      this.http.put<HostRules>(`${API_BASE}/host/publications/${publicationId}/rules`, payload),
    );
  }

  blockDates(unitId: string, from: string, to: string): Promise<HostDayAvailability[]> {
    return firstValueFrom(
      this.http.put<HostDayAvailability[]>(
        `${API_BASE}/host/units/${unitId}/availability/blocks`,
        null,
        {
          params: new HttpParams({ fromObject: { from, to } }),
        },
      ),
    );
  }

  releaseDates(unitId: string, from: string, to: string): Promise<HostDayAvailability[]> {
    return firstValueFrom(
      this.http.delete<HostDayAvailability[]>(
        `${API_BASE}/host/units/${unitId}/availability/blocks`,
        {
          params: new HttpParams({ fromObject: { from, to } }),
        },
      ),
    );
  }
}
