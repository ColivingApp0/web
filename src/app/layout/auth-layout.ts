import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

/** Shell de la zona pública de acceso: marca + tarjeta centrada. */
@Component({
  selector: 'app-auth-layout',
  imports: [RouterOutlet],
  template: `
    <div class="flex min-h-dvh flex-col bg-soft">
      <header class="px-4 py-6">
        <a
          routerLink="/"
          class="mx-auto flex max-w-md items-center gap-2 font-display text-xl font-extrabold text-ink"
        >
          <span
            class="grid size-9 place-items-center rounded-xl bg-accent-500 font-black text-brand-800"
            aria-hidden="true"
            >C</span
          >
          <span>Colivin<span class="text-accent-600">App</span></span>
        </a>
      </header>

      <main class="flex flex-1 items-start justify-center px-4 pb-16">
        <div class="w-full max-w-md">
          <router-outlet />
        </div>
      </main>
    </div>
  `,
})
export class AuthLayout {}
