import { HttpClient } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import {
  API_COLOMBIA_BASE,
  ColombiaCityResponse,
  ColombiaDepartmentResponse,
  ColombiaUniversityResponse,
  DirectoryCity,
  DirectoryUniversity,
  toDirectoryCities,
  toDirectoryUniversities,
} from '../models/directory-models';

/**
 * Consultas al **directorio público** de API-Colombia (ciudades y universidades).
 *
 * API-Colombia recomienda **cachear**: los datos cambian poco y el servicio limita
 * a 60 solicitudes por minuto por IP. Cada colección se descarga una vez por
 * sesión (promesa memoizada) y se reutiliza; nadie persiste nada.
 *
 * Estas llamadas van a un origen **externo**. El `authInterceptor` adjunta el
 * token `Bearer` solo a las rutas del backend propio (`/api/...`), de modo que
 * aquí nunca se filtra la sesión de ColivinApp a un tercero.
 */
@Service()
export class DirectoryApi {
  private readonly http = inject(HttpClient);
  private citiesPromise?: Promise<DirectoryCity[]>;
  private universitiesPromise?: Promise<DirectoryUniversity[]>;

  /** Ciudades de Colombia con el nombre de su departamento resuelto. */
  cities(): Promise<DirectoryCity[]> {
    return (this.citiesPromise ??= this.loadCities().catch((error: unknown) => {
      // Un fallo no se cachea: permite reintentar desde la UI.
      this.citiesPromise = undefined;
      throw error;
    }));
  }

  /** Instituciones de educación superior (universidades) de Colombia. */
  universities(): Promise<DirectoryUniversity[]> {
    return (this.universitiesPromise ??= this.loadUniversities().catch((error: unknown) => {
      this.universitiesPromise = undefined;
      throw error;
    }));
  }

  private async loadCities(): Promise<DirectoryCity[]> {
    const [cities, departments] = await Promise.all([
      firstValueFrom(this.http.get<ColombiaCityResponse[]>(`${API_COLOMBIA_BASE}/City`)),
      firstValueFrom(
        this.http.get<ColombiaDepartmentResponse[]>(`${API_COLOMBIA_BASE}/Department`),
      ),
    ]);
    return toDirectoryCities(cities, departments);
  }

  private async loadUniversities(): Promise<DirectoryUniversity[]> {
    const universities = await firstValueFrom(
      this.http.get<ColombiaUniversityResponse[]>(
        `${API_COLOMBIA_BASE}/HigherEducationInstitution`,
      ),
    );
    return toDirectoryUniversities(universities);
  }
}
