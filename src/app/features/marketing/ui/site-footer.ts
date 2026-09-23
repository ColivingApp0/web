import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/** Pie público de la landing: navegación real (sin enlaces muertos). */
@Component({
  selector: 'app-site-footer',
  imports: [RouterLink],
  template: `
    <footer class="bg-brand-800 py-16 pb-6 text-white">
      <div class="mx-auto grid w-full max-w-page gap-10 px-5 lg:grid-cols-[2fr_1fr_1fr]">
        <div>
          <a routerLink="/" class="flex items-center gap-2.5 font-display text-xl font-extrabold">
            <span
              class="grid size-9 place-items-center rounded-xl bg-accent-500 font-black text-brand-800"
              aria-hidden="true"
              >C</span
            >
            <span>Colivin<span class="text-accent-500">App</span></span>
          </a>
          <p class="mt-4 max-w-sm text-sm text-white/70">
            Vive, conecta y comparte. Una comunidad pensada para encontrar el lugar y las personas
            correctas.
          </p>
        </div>

        <nav aria-label="Explorar">
          <h4 class="font-display text-base font-bold">Explorar</h4>
          <a routerLink="/alojamientos" class="mt-3 block text-sm text-white/75 hover:text-white"
            >Alojamientos</a
          >
          <a href="#comunidad" class="mt-2 block text-sm text-white/75 hover:text-white"
            >Comunidad</a
          >
          <a href="#como-funciona" class="mt-2 block text-sm text-white/75 hover:text-white"
            >Cómo funciona</a
          >
        </nav>

        <nav aria-label="Tu cuenta">
          <h4 class="font-display text-base font-bold">Tu cuenta</h4>
          <a routerLink="/perfil" class="mt-3 block text-sm text-white/75 hover:text-white"
            >Mi perfil</a
          >
          <a routerLink="/entrar" class="mt-2 block text-sm text-white/75 hover:text-white"
            >Iniciar sesión</a
          >
          <a routerLink="/registro" class="mt-2 block text-sm text-white/75 hover:text-white"
            >Crear cuenta</a
          >
        </nav>
      </div>

      <div
        class="mx-auto mt-12 flex w-full max-w-page flex-wrap justify-between gap-2 border-t border-white/10 px-5 pt-5 text-xs text-white/60"
      >
        <span>© 2026 ColivinApp. Todos los derechos reservados.</span>
        <span>Hecho para vivir mejor juntos.</span>
      </div>
    </footer>
  `,
})
export class SiteFooter {}
