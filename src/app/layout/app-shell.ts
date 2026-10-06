import { Component, computed, inject } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { AuthSession } from '../core/auth/auth-session';
import { UiButton } from '../shared/ui/button';

/** Shell de la zona autenticada: cabecera con usuario y cierre de sesión. */
@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, UiButton],
  template: `
    <div class="flex min-h-dvh flex-col bg-soft">
      <header class="border-b border-line bg-white">
        <div class="mx-auto flex h-16 max-w-5xl items-center justify-between gap-4 px-4">
          <a
            routerLink="/perfil"
            class="flex items-center gap-2 font-display text-lg font-extrabold text-ink"
          >
            <span
              class="grid size-8 place-items-center rounded-lg bg-accent-500 text-sm font-black text-brand-800"
              aria-hidden="true"
              >C</span
            >
            <span>Colivin<span class="text-accent-600">App</span></span>
          </a>

          <div class="flex min-w-0 items-center gap-3">
            @if (session.activeRole()?.code === 'ANFITRION') {
              <a
                routerLink="/anfitrion"
                class="hidden text-sm font-bold text-brand-700 hover:underline sm:block"
                >Anfitrión</a
              >
            }
            @if (hasGuestRole()) {
              <a
                routerLink="/reservas"
                class="hidden text-sm font-bold text-brand-700 hover:underline sm:block"
                >Reservas</a
              >
            }
            <a
              routerLink="/mensajes"
              class="hidden text-sm font-bold text-brand-700 hover:underline sm:block"
              >Mensajes</a
            >
            <a
              routerLink="/notificaciones"
              class="hidden text-sm font-bold text-brand-700 hover:underline sm:block"
              >Notificaciones</a
            >
            <a
              routerLink="/comunidad"
              class="hidden text-sm font-bold text-brand-700 hover:underline sm:block"
              >Comunidad</a
            >
            <a
              routerLink="/reputacion"
              class="hidden text-sm font-bold text-brand-700 hover:underline sm:block"
              >Reputación</a
            >
            @if (isInternalRole()) {
              <a
                routerLink="/admin"
                class="hidden text-sm font-bold text-brand-700 hover:underline sm:block"
                >Administración</a
              >
            }
            <a
              routerLink="/directorio"
              class="hidden text-sm font-bold text-brand-700 hover:underline sm:block"
              >Directorio</a
            >
            <a
              routerLink="/favoritos"
              class="hidden text-sm font-bold text-brand-700 hover:underline sm:block"
              >Favoritos</a
            >
            <span
              class="hidden max-w-52 truncate text-sm text-muted sm:block"
              [title]="session.user()?.email ?? ''"
            >
              {{ session.user()?.email }}
            </span>
            <ui-button variant="secondary" (click)="logout()">Cerrar sesión</ui-button>
          </div>
        </div>
      </header>

      <main class="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
        <router-outlet />
      </main>
    </div>
  `,
})
export class AppShell {
  protected readonly session = inject(AuthSession);
  private readonly router = inject(Router);

  /** Algún rol de huésped activo: mismo criterio que los controladores de reservas. */
  protected readonly hasGuestRole = computed(() =>
    (this.session.user()?.roles ?? []).some(
      (role) => role.active && role.code.startsWith('HUESPED'),
    ),
  );

  /**
   * Rol activo interno: mismo criterio que el gate real del backend
   * (`/api/v1/admin/**` exige rol activo MODERADOR o ADMINISTRADOR).
   */
  protected readonly isInternalRole = computed(() => {
    const active = this.session.activeRole()?.code;
    return active === 'MODERADOR' || active === 'ADMINISTRADOR';
  });

  protected async logout(): Promise<void> {
    await this.session.logout();
    await this.router.navigate(['/entrar']);
  }
}
