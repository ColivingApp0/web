import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthSession } from '../../../core/auth/auth-session';
import { RoleCode } from '../../../core/auth/identity-contract';
import { ApiError, toApiError } from '../../../core/http/api-error';
import { UiAlert } from '../../../shared/ui/alert';
import { UiButton } from '../../../shared/ui/button';

interface RoleOption {
  code: RoleCode;
  title: string;
  description: string;
}

/** Solo los roles que un usuario puede elegir por sí mismo (SelectRoleService del backend). */
const ROLE_OPTIONS: readonly RoleOption[] = [
  {
    code: 'HUESPED_ESTUDIANTE',
    title: 'Huésped estudiante',
    description: 'Busco alojamiento cerca de mi institución y quiero conocer la comunidad.',
  },
  {
    code: 'HUESPED_TURISTA',
    title: 'Huésped turista',
    description: 'Busco estancias temporales, sin vínculo académico.',
  },
  {
    code: 'ANFITRION',
    title: 'Anfitrión',
    description: 'Publico y gestiono propiedades, unidades y solicitudes.',
  },
];

@Component({
  selector: 'app-select-role-page',
  imports: [RouterLink, UiAlert, UiButton],
  templateUrl: './select-role-page.html',
})
export class SelectRolePage {
  protected readonly session = inject(AuthSession);
  private readonly router = inject(Router);

  protected readonly options = ROLE_OPTIONS;
  protected readonly chosen = signal<RoleCode | null>(null);
  protected readonly submitting = signal(false);
  protected readonly serverError = signal<string | null>(null);

  protected choose(code: RoleCode): void {
    this.chosen.set(code);
  }

  protected async submit(): Promise<void> {
    const code = this.chosen();
    if (!code || this.submitting()) return;
    this.submitting.set(true);
    this.serverError.set(null);
    try {
      await this.session.selectRole(code);
      await this.router.navigate(['/perfil']);
    } catch (error) {
      this.serverError.set(this.messageFor(toApiError(error)));
    } finally {
      this.submitting.set(false);
    }
  }

  private messageFor(error: ApiError): string {
    switch (error.code) {
      case 'CONFLICT':
        return 'Tu perfil aún no tiene los datos mínimos para este rol. Complétalo y guárdalo antes de continuar.';
      case 'FORBIDDEN':
        return 'No puedes seleccionar este rol.';
      default:
        return error.message;
    }
  }
}
