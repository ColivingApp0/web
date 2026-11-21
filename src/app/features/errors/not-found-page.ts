import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/** Página 404 real para rutas desconocidas (no redirige en silencio a la landing). */
@Component({
  selector: 'app-not-found-page',
  imports: [RouterLink],
  template: `
    <main class="grid min-h-dvh place-items-center bg-soft px-4 py-12">
      <section
        class="w-full max-w-lg rounded-card border border-line bg-white p-8 text-center shadow-card"
      >
        <p class="ui-eyebrow">Error 404</p>
        <h1 class="mt-2 font-display text-3xl font-extrabold tracking-tight text-ink">
          No encontramos esta página
        </h1>
        <p class="mt-3 text-sm leading-relaxed text-muted">
          Puede que el enlace esté mal escrito o que la página ya no exista. Puedes volver al inicio
          o explorar las habitaciones disponibles.
        </p>
        <div class="mt-6 flex flex-wrap justify-center gap-3">
          <a
            routerLink="/"
            class="inline-flex min-h-11 items-center justify-center rounded-xl border border-line px-4 text-sm font-bold text-ink transition hover:bg-soft"
            >Ir al inicio</a
          >
          <a
            routerLink="/alojamientos"
            class="inline-flex min-h-11 items-center justify-center rounded-xl bg-brand-700 px-4 text-sm font-bold text-white transition hover:bg-brand-600"
            >Explorar habitaciones</a
          >
        </div>
      </section>
    </main>
  `,
})
export class NotFoundPage {}
