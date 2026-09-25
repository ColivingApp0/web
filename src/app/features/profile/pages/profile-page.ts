import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthSession } from '../../../core/auth/auth-session';
import { toApiError } from '../../../core/http/api-error';
import { UiAlert } from '../../../shared/ui/alert';
import { UiButton } from '../../../shared/ui/button';
import { ProfileApi } from '../data-access/profile-api';
import { ProfileView, VerificationLevel } from '../models/profile-models';
import { ConsentsPanel } from '../ui/consents-panel';
import { PrivacyForm } from '../ui/privacy-form';
import { ProfileForm } from '../ui/profile-form';

const LEVEL_LABELS: Record<VerificationLevel, string> = {
  NO_VERIFICADO: 'Sin verificar',
  BASICO: 'Verificación básica',
  COMPLETO: 'Verificado',
};

/** Página de perfil: cuenta, datos, privacidad, consentimientos y verificación. */
@Component({
  selector: 'app-profile-page',
  imports: [RouterLink, UiAlert, UiButton, ProfileForm, PrivacyForm, ConsentsPanel],
  templateUrl: './profile-page.html',
})
export class ProfilePage {
  protected readonly session = inject(AuthSession);
  private readonly profileApi = inject(ProfileApi);

  protected readonly loading = signal(true);
  protected readonly loadError = signal<string | null>(null);
  protected readonly profile = signal<ProfileView | null>(null);

  constructor() {
    void this.load();
  }

  protected async load(): Promise<void> {
    this.loading.set(true);
    this.loadError.set(null);
    try {
      this.profile.set(await this.profileApi.get());
    } catch (error) {
      this.loadError.set(toApiError(error).message);
    } finally {
      this.loading.set(false);
    }
  }

  protected onProfileSaved(updated: ProfileView): void {
    this.profile.set(updated);
  }

  protected levelLabel(level: VerificationLevel): string {
    return LEVEL_LABELS[level];
  }
}
