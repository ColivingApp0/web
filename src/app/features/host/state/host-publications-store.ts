import { Service, signal } from '@angular/core';
import { HostPublication } from '../models/host-models';

/**
 * Publicaciones creadas durante la sesión, por unidad.
 *
 * Motivo real (limitación del backend): no existe endpoint de lectura de
 * publicaciones del anfitrión (`GET /host/publications` no está expuesto), solo
 * su creación devuelve el id. El store conserva lo creado mientras dure la
 * navegación por las rutas de anfitrión (se provee en el padre `anfitrion`),
 * sin convertirse en estado global ni inventar contratos.
 */
@Service()
export class HostPublicationsStore {
  private readonly byUnit = signal<ReadonlyMap<string, HostPublication>>(new Map());

  findByUnit(unitId: string): HostPublication | null {
    return this.byUnit().get(unitId) ?? null;
  }

  remember(publication: HostPublication): void {
    this.byUnit.update((map) => {
      const next = new Map(map);
      next.set(publication.unitId, publication);
      return next;
    });
  }
}
