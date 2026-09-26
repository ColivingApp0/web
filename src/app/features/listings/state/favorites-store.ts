import { Service, inject, signal } from '@angular/core';
import { toApiError } from '../../../core/http/api-error';
import { ListingsApi } from '../data-access/listings-api';

/**
 * Estado de favoritos del usuario dentro de la feature `listings` (RF-034).
 * Se provee a nivel de ruta (`providers` en las rutas de alojamientos): cada
 * página carga el conjunto una vez y lo mantiene mientras vive la ruta, sin
 * convertirlo en estado global de la aplicación.
 */
@Service()
export class FavoritesStore {
  private readonly api = inject(ListingsApi);

  private readonly ids = signal<ReadonlySet<string>>(new Set());
  private readonly loaded = signal(false);
  private readonly pending = signal<ReadonlySet<string>>(new Set());

  readonly favoriteIds = this.ids.asReadonly();
  readonly error = signal<string | null>(null);

  isFavorite(publicationId: string): boolean {
    return this.ids().has(publicationId);
  }

  isPending(publicationId: string): boolean {
    return this.pending().has(publicationId);
  }

  /** Carga el conjunto de favoritos una sola vez por instancia (ruta). */
  async load(): Promise<void> {
    if (this.loaded()) return;
    try {
      const favorites = await this.api.listFavorites();
      this.ids.set(new Set(favorites.map((favorite) => favorite.publicationId)));
      this.loaded.set(true);
    } catch (error) {
      // El 401 lo gestiona el interceptor; otros errores no bloquean la página.
      this.error.set(toApiError(error).message);
    }
  }

  /** Alterna el favorito; refleja de inmediato el estado y tolera carreras con el servidor. */
  async toggle(publicationId: string): Promise<void> {
    if (this.pending().has(publicationId)) return;
    this.error.set(null);
    this.pending.update((set) => new Set(set).add(publicationId));
    const wasFavorite = this.isFavorite(publicationId);
    try {
      if (wasFavorite) {
        await this.api.removeFavorite(publicationId);
        this.removeLocally(publicationId);
      } else {
        await this.api.addFavorite(publicationId);
        this.addLocally(publicationId);
      }
    } catch (error) {
      const apiError = toApiError(error);
      // Carreras: ya era favorito (CONFLICT) o ya no existía (NOT_FOUND) → estado real.
      if (!wasFavorite && apiError.code === 'CONFLICT') {
        this.addLocally(publicationId);
      } else if (wasFavorite && apiError.code === 'NOT_FOUND') {
        this.removeLocally(publicationId);
      } else {
        this.error.set(apiError.message);
      }
    } finally {
      this.pending.update((set) => {
        const next = new Set(set);
        next.delete(publicationId);
        return next;
      });
    }
  }

  private addLocally(publicationId: string): void {
    this.ids.update((set) => new Set(set).add(publicationId));
  }

  private removeLocally(publicationId: string): void {
    this.ids.update((set) => {
      const next = new Set(set);
      next.delete(publicationId);
      return next;
    });
  }
}
