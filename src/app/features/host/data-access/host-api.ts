import { HttpClient } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { API_BASE } from '../../../core/http/api-base';
import {
  CreatePropertyPayload,
  CreateUnitPayload,
  HostProperty,
  HostPropertyDetail,
  HostPublication,
  HostPublicationAction,
  HostUnit,
  PricingPayload,
  UpdatePropertyPayload,
  UpdateUnitPayload,
} from '../models/host-models';

/** Endpoints del anfitrión; permisos y gates los aplica el backend. */
@Service()
export class HostApi {
  private readonly http = inject(HttpClient);

  // ---------- Propiedades ----------

  listProperties(): Promise<HostProperty[]> {
    return firstValueFrom(this.http.get<HostProperty[]>(`${API_BASE}/host/properties`));
  }

  propertyDetail(propertyId: string): Promise<HostPropertyDetail> {
    return firstValueFrom(
      this.http.get<HostPropertyDetail>(`${API_BASE}/host/properties/${propertyId}`),
    );
  }

  createProperty(payload: CreatePropertyPayload): Promise<HostProperty> {
    return firstValueFrom(this.http.post<HostProperty>(`${API_BASE}/host/properties`, payload));
  }

  updateProperty(propertyId: string, payload: UpdatePropertyPayload): Promise<HostProperty> {
    return firstValueFrom(
      this.http.patch<HostProperty>(`${API_BASE}/host/properties/${propertyId}`, payload),
    );
  }

  addPropertyPhoto(propertyId: string, url: string, position?: number): Promise<HostProperty> {
    return firstValueFrom(
      this.http.post<HostProperty>(`${API_BASE}/host/properties/${propertyId}/photos`, {
        url,
        position,
      }),
    );
  }

  deletePropertyPhoto(propertyId: string, photoId: string): Promise<HostProperty> {
    return firstValueFrom(
      this.http.delete<HostProperty>(`${API_BASE}/host/properties/${propertyId}/photos/${photoId}`),
    );
  }

  reorderPropertyPhotos(propertyId: string, photoIds: string[]): Promise<HostProperty> {
    return firstValueFrom(
      this.http.put<HostProperty>(`${API_BASE}/host/properties/${propertyId}/photos/order`, {
        photoIds,
      }),
    );
  }

  // ---------- Habitaciones ----------

  listUnits(propertyId: string): Promise<HostUnit[]> {
    return firstValueFrom(
      this.http.get<HostUnit[]>(`${API_BASE}/host/properties/${propertyId}/units`),
    );
  }

  unit(unitId: string): Promise<HostUnit> {
    return firstValueFrom(this.http.get<HostUnit>(`${API_BASE}/host/units/${unitId}`));
  }

  createUnit(propertyId: string, payload: CreateUnitPayload): Promise<HostUnit> {
    return firstValueFrom(
      this.http.post<HostUnit>(`${API_BASE}/host/properties/${propertyId}/units`, payload),
    );
  }

  updateUnit(unitId: string, payload: UpdateUnitPayload): Promise<HostUnit> {
    return firstValueFrom(this.http.patch<HostUnit>(`${API_BASE}/host/units/${unitId}`, payload));
  }

  setUnitAvailability(unitId: string, enabled: boolean): Promise<HostUnit> {
    return firstValueFrom(
      this.http.put<HostUnit>(`${API_BASE}/host/units/${unitId}/availability`, { enabled }),
    );
  }

  addUnitPhoto(unitId: string, url: string, position?: number): Promise<HostUnit> {
    return firstValueFrom(
      this.http.post<HostUnit>(`${API_BASE}/host/units/${unitId}/photos`, { url, position }),
    );
  }

  deleteUnitPhoto(unitId: string, photoId: string): Promise<HostUnit> {
    return firstValueFrom(
      this.http.delete<HostUnit>(`${API_BASE}/host/units/${unitId}/photos/${photoId}`),
    );
  }

  reorderUnitPhotos(unitId: string, photoIds: string[]): Promise<HostUnit> {
    return firstValueFrom(
      this.http.put<HostUnit>(`${API_BASE}/host/units/${unitId}/photos/order`, { photoIds }),
    );
  }

  // ---------- Publicación / precio mensual ----------

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

  configurePricing(publicationId: string, payload: PricingPayload): Promise<unknown> {
    return firstValueFrom(
      this.http.put<unknown>(`${API_BASE}/host/publications/${publicationId}/pricing`, payload),
    );
  }
}
