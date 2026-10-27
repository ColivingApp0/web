import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthSession } from '../core/auth/auth-session';
import { UiAvatar } from '../shared/ui/avatar';
import { UiButton } from '../shared/ui/button';
import { UiIcon } from '../shared/ui/icon';

/** Shell autenticado: navegación tipo Airbnb, menú de cuenta y barra inferior móvil. */
@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, UiAvatar, UiIcon],
  template: `
    <div class="flex min-h-dvh flex-col bg-surface">
      <a
        href="#main-content"
        class="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:font-bold focus:text-brand-700"
        >Saltar al contenido</a
      >
      <header class="sticky top-0 z-40 border-b border-line bg-white/95 backdrop-blur">
        <div
          class="mx-auto flex h-16 w-full max-w-wide items-center justify-between gap-3 px-4 sm:px-6"
        >
          <a
            routerLink="/alojamientos"
            class="flex items-center gap-2 font-display text-lg font-extrabold text-ink"
          >
            <span
              class="grid size-9 place-items-center rounded-xl bg-brand-700 text-sm font-black text-white"
              aria-hidden="true"
              >C</span
            >
            <span>Colivin<span class="text-brand-600">App</span></span>
          </a>

          <nav class="hidden items-center gap-1 lg:flex" aria-label="Navegación principal">
            <a
              routerLink="/alojamientos"
              routerLinkActive="bg-soft text-ink"
              class="flex min-h-10 items-center gap-2 rounded-pill px-4 text-sm font-bold text-muted transition hover:bg-soft hover:text-ink"
            >
              <ui-icon name="search" size="sm" /> Explorar
            </a>
            <a
              routerLink="/favoritos"
              routerLinkActive="bg-soft text-ink"
              class="flex min-h-10 items-center gap-2 rounded-pill px-4 text-sm font-bold text-muted transition hover:bg-soft hover:text-ink"
            >
              <ui-icon name="heart" size="sm" /> Favoritos
            </a>
            <a
              routerLink="/reservas"
              routerLinkActive="bg-soft text-ink"
              class="flex min-h-10 items-center gap-2 rounded-pill px-4 text-sm font-bold text-muted transition hover:bg-soft hover:text-ink"
            >
              <ui-icon name="clipboard" size="sm" /> Solicitudes
            </a>
            <a
              routerLink="/mensajes"
              routerLinkActive="bg-soft text-ink"
              class="flex min-h-10 items-center gap-2 rounded-pill px-4 text-sm font-bold text-muted transition hover:bg-soft hover:text-ink"
            >
              <ui-icon name="message" size="sm" /> Mensajes
            </a>
          </nav>

          <div class="flex items-center gap-2">
            @if (session.activeRole()?.code === 'ANFITRION') {
              <a
                routerLink="/anfitrion"
                class="hidden min-h-10 items-center gap-2 rounded-pill border border-line px-4 text-sm font-bold text-ink transition hover:border-line-strong hover:bg-soft xl:flex"
              >
                <ui-icon name="home" size="sm" /> Modo anfitrión
              </a>
            }
            <a
              routerLink="/notificaciones"
              class="grid size-10 place-items-center rounded-full text-muted transition hover:bg-soft hover:text-ink"
              aria-label="Notificaciones"
            >
              <ui-icon name="bell" size="md" />
            </a>

            <div class="relative">
              <button
                type="button"
                class="flex min-h-10 items-center gap-2 rounded-pill border border-line bg-white px-2 py-1.5 transition hover:border-line-strong hover:shadow-soft"
                [attr.aria-expanded]="menuOpen()"
                aria-haspopup="menu"
                aria-label="Menú de cuenta"
                (click)="menuOpen.set(!menuOpen())"
              >
                <ui-icon name="menu" size="sm" class="text-ink" />
                <ui-avatar [name]="displayName()" size="sm" />
              </button>

              @if (menuOpen()) {
                <div
                  class="absolute right-0 top-12 z-50 w-64 overflow-hidden rounded-2xl border border-line bg-white p-2 shadow-float"
                  role="menu"
                >
                  <div class="border-b border-line px-3 py-2">
                    <p class="truncate text-sm font-bold text-ink">{{ displayName() }}</p>
                    <p class="truncate text-xs text-muted">{{ session.user()?.email }}</p>
                    @if (session.activeRole(); as role) {
                      <p class="mt-1 text-[11px] font-bold uppercase tracking-wide text-brand-700">
                        {{ role.name }}
                      </p>
                    }
                  </div>
                  <a
                    routerLink="/perfil"
                    role="menuitem"
                    class="flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-ink hover:bg-soft"
                    (click)="menuOpen.set(false)"
                    ><ui-icon name="user" size="sm" /> Mi perfil</a
                  >
                  @if (session.activeRole()?.code === 'ANFITRION') {
                    <a
                      routerLink="/anfitrion"
                      role="menuitem"
                      class="flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-ink hover:bg-soft"
                      (click)="menuOpen.set(false)"
                      ><ui-icon name="home" size="sm" /> Panel del anfitrión</a
                    >
                  }
                  <a
                    routerLink="/reputacion"
                    role="menuitem"
                    class="flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-ink hover:bg-soft"
                    (click)="menuOpen.set(false)"
                    ><ui-icon name="star" size="sm" /> Mi reputación</a
                  >
                  @if (isInternalRole()) {
                    <a
                      routerLink="/admin"
                      role="menuitem"
                      class="flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-ink hover:bg-soft"
                      (click)="menuOpen.set(false)"
                      ><ui-icon name="settings" size="sm" /> Administración</a
                    >
                  }
                  <button
                    type="button"
                    role="menuitem"
                    class="flex min-h-10 w-full items-center gap-2 rounded-lg px-3 text-left text-sm font-semibold text-danger-700 hover:bg-danger-50"
                    (click)="logout()"
                  >
                    <ui-icon name="logout" size="sm" /> Cerrar sesión
                  </button>
                </div>
              }
            </div>
          </div>
        </div>
      </header>

      <main
        id="main-content"
        class="mx-auto w-full max-w-wide flex-1 px-4 py-6 pb-24 sm:px-6 sm:py-8 lg:pb-8"
      >
        <router-outlet />
      </main>

      <footer class="hidden border-t border-line bg-white px-6 py-6 text-xs text-muted md:block">
        <div class="mx-auto flex max-w-wide flex-wrap items-center justify-between gap-3">
          <span>ColivinApp · Renta mensual de habitaciones</span>
          <nav class="flex gap-4" aria-label="Enlaces de pie de página">
            <a routerLink="/directorio" class="hover:text-ink">Directorio</a>
            <a routerLink="/comunidad" class="hover:text-ink">Comunidad</a>
            <a routerLink="/perfil" class="hover:text-ink">Mi cuenta</a>
          </nav>
        </div>
      </footer>

      <nav
        class="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 px-2 py-2 backdrop-blur lg:hidden"
        aria-label="Navegación móvil"
      >
        <div class="mx-auto grid max-w-md grid-cols-5 text-center">
          <a
            routerLink="/alojamientos"
            routerLinkActive="text-brand-700"
            class="flex flex-col items-center gap-0.5 py-1 text-[10px] font-bold text-muted"
          >
            <ui-icon name="search" size="md" /> Explorar
          </a>
          <a
            routerLink="/favoritos"
            routerLinkActive="text-brand-700"
            class="flex flex-col items-center gap-0.5 py-1 text-[10px] font-bold text-muted"
          >
            <ui-icon name="heart" size="md" /> Favoritos
          </a>
          <a
            routerLink="/reservas"
            routerLinkActive="text-brand-700"
            class="flex flex-col items-center gap-0.5 py-1 text-[10px] font-bold text-muted"
          >
            <ui-icon name="clipboard" size="md" /> Solicitudes
          </a>
          <a
            routerLink="/mensajes"
            routerLinkActive="text-brand-700"
            class="flex flex-col items-center gap-0.5 py-1 text-[10px] font-bold text-muted"
          >
            <ui-icon name="message" size="md" /> Mensajes
          </a>
          <a
            routerLink="/perfil"
            routerLinkActive="text-brand-700"
            class="flex flex-col items-center gap-0.5 py-1 text-[10px] font-bold text-muted"
          >
            <ui-icon name="user" size="md" /> Perfil
          </a>
        </div>
      </nav>
    </div>
  `,
})
export class AppShell {
  protected readonly session = inject(AuthSession);
  private readonly router = inject(Router);
  protected readonly menuOpen = signal(false);

  protected readonly displayName = computed(() => {
    const email = this.session.user()?.email ?? 'Mi cuenta';
    return email.split('@')[0].replace(/[._-]+/g, ' ');
  });

  protected readonly isInternalRole = computed(() => {
    const active = this.session.activeRole()?.code;
    return active === 'MODERADOR' || active === 'ADMINISTRADOR';
  });

  protected async logout(): Promise<void> {
    this.menuOpen.set(false);
    await this.session.logout();
    await this.router.navigate(['/entrar']);
  }
}
