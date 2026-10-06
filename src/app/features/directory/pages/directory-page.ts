import { Component, computed, inject, resource, signal } from '@angular/core';
import { toApiError } from '../../../core/http/api-error';
import { UiAlert } from '../../../shared/ui/alert';
import { UiButton } from '../../../shared/ui/button';
import { DirectoryApi } from '../data-access/directory-api';
import {
  DIRECTORY_RESULT_LIMIT,
  externalWebsiteUrl,
  searchCities,
  searchUniversities,
} from '../models/directory-models';

type DirectoryMode = 'cities' | 'universities';

/**
 * Directorio público de ciudades y universidades de Colombia (RF-030, apoyo al
 * filtro por ciudad/universidad). Los datos provienen de la API abierta
 * API-Colombia, **no** del backend de ColivinApp.
 *
 * La búsqueda es local sobre la colección (la API no ofrece endpoint de búsqueda
 * por texto): se descarga una vez por sesión (`DirectoryApi`, memoizado) y se
 * filtra en el cliente con funciones puras. Como los identificadores de este
 * directorio no son los UUID de los catálogos del backend, el resultado es de
 * **consulta**: sirve para explorar, y no se envía como filtro a `/search/listings`.
 */
@Component({
  selector: 'app-directory-page',
  imports: [UiAlert, UiButton],
  templateUrl: './directory-page.html',
})
export class DirectoryPage {
  private readonly api = inject(DirectoryApi);

  protected readonly mode = signal<DirectoryMode>('cities');
  protected readonly query = signal('');

  private readonly citiesResource = resource({ loader: () => this.api.cities() });
  private readonly universitiesResource = resource({ loader: () => this.api.universities() });

  protected readonly cityResults = computed(() =>
    searchCities(this.citiesResource.value() ?? [], this.query()),
  );
  protected readonly universityResults = computed(() =>
    searchUniversities(this.universitiesResource.value() ?? [], this.query()),
  );

  protected readonly resultLimit = DIRECTORY_RESULT_LIMIT;
  protected readonly websiteUrl = externalWebsiteUrl;
  protected readonly searching = computed(() => this.query().trim().length > 0);
  protected readonly loading = computed(() =>
    this.mode() === 'cities'
      ? this.citiesResource.isLoading()
      : this.universitiesResource.isLoading(),
  );
  protected readonly loadError = computed(() => {
    const error =
      this.mode() === 'cities' ? this.citiesResource.error() : this.universitiesResource.error();
    return error ? toApiError(error).message : null;
  });
  protected readonly resultCount = computed(() =>
    this.mode() === 'cities' ? this.cityResults().length : this.universityResults().length,
  );
  protected readonly hasResults = computed(() => this.resultCount() > 0);
  protected readonly reachedLimit = computed(() => this.resultCount() >= DIRECTORY_RESULT_LIMIT);

  protected onQueryChange(event: Event): void {
    const target = event.target;
    if (target instanceof HTMLInputElement) this.query.set(target.value);
  }

  protected setMode(mode: DirectoryMode): void {
    this.mode.set(mode);
  }

  protected clearQuery(): void {
    this.query.set('');
  }

  protected retry(): void {
    if (this.mode() === 'cities') this.citiesResource.reload();
    else this.universitiesResource.reload();
  }
}
