import { Service, computed, inject, signal } from '@angular/core';
import { ProfileView } from '../models/profile-models';
import { ProfileApi } from './profile-api';

/**
 * Perfil de la cuenta compartido por el shell y la página de perfil.
 *
 * Evita que el menú de cuenta invente un nombre a partir del correo y mantiene
 * sincronizado el nombre visible cuando se guarda el perfil. El backend sigue
 * siendo la fuente de verdad: este estado solo cachea la última lectura.
 */
@Service()
export class AccountProfileStore {
  private readonly api = inject(ProfileApi);
  private readonly state = signal<ProfileView | null>(null);
  private loading: Promise<void> | null = null;

  readonly profile = this.state.asReadonly();
  readonly displayName = computed(() => {
    const name = this.state()?.name?.trim();
    return name && name !== '' ? name : null;
  });

  async load(): Promise<void> {
    if (this.state() !== null || this.loading !== null) return this.loading ?? Promise.resolve();
    this.loading = this.api
      .get()
      .then((profile) => this.state.set(profile))
      .catch(() => undefined)
      .finally(() => {
        this.loading = null;
      });
    return this.loading;
  }

  set(profile: ProfileView): void {
    this.state.set(profile);
  }

  clear(): void {
    this.state.set(null);
  }
}
