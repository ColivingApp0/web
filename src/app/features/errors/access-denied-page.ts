import { Component, computed, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

/** Explica por qué un rol no puede entrar a una sección, en lugar de redirigir en silencio. */
@Component({
  selector: 'app-access-denied-page',
  imports: [RouterLink],
  template: `
    <div class="mx-auto max-w-2xl space-y-5">
      <section class="rounded-card border border-line bg-white p-8 shadow-card">
        <p class="ui-eyebrow">Acceso restringido</p>
        <h1 class="mt-2 font-display text-2xl font-extrabold tracking-tight text-ink">
          No tienes permiso para entrar a esta sección
        </h1>
        <p class="mt-3 text-sm leading-relaxed text-muted">
          @if (isAdminArea()) {
            El área de administración requiere un rol interno activo (moderador o administrador). Tu
            cuenta puede seguir usando el resto de la plataforma con normalidad.
          } @else {
            Esta sección requiere un rol activo distinto al tuyo. Puedes cambiarlo ahora y volver a
            intentarlo, o seguir explorando con tu rol actual.
          }
        </p>
        <div class="mt-6 flex flex-wrap gap-3">
          @if (isAdminArea()) {
            <a
              routerLink="/perfil"
              class="inline-flex min-h-11 items-center justify-center rounded-xl bg-brand-700 px-4 text-sm font-bold text-white transition hover:bg-brand-600"
              >Ir a mi perfil</a
            >
          } @else {
            <a
              routerLink="/seleccionar-rol"
              class="inline-flex min-h-11 items-center justify-center rounded-xl bg-brand-700 px-4 text-sm font-bold text-white transition hover:bg-brand-600"
              >Cambiar de rol</a
            >
            <a
              routerLink="/perfil"
              class="inline-flex min-h-11 items-center justify-center rounded-xl border border-line px-4 text-sm font-bold text-ink transition hover:bg-soft"
              >Ver mi perfil</a
            >
          }
          <a
            routerLink="/alojamientos"
            class="inline-flex min-h-11 items-center justify-center rounded-xl border border-line px-4 text-sm font-bold text-ink transition hover:bg-soft"
            >Explorar habitaciones</a
          >
        </div>
      </section>
    </div>
  `,
})
export class AccessDeniedPage {
  private readonly route = inject(ActivatedRoute);
  protected readonly isAdminArea = computed(() =>
    (this.route.snapshot.queryParamMap.get('recurso') ?? '').startsWith('/admin'),
  );
}
