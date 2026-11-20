import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

/** Página pública de términos o privacidad, enlazada desde el registro. */
@Component({
  selector: 'app-legal-page',
  imports: [RouterLink],
  template: `
    <main class="mx-auto w-full max-w-3xl px-4 py-12">
      <a routerLink="/" class="text-sm font-bold text-brand-700 hover:underline"
        >← Volver a ColivinApp</a
      >

      @if (kind === 'terms') {
        <h1 class="mt-6 font-display text-3xl font-extrabold tracking-tight text-ink">
          Términos de uso
        </h1>
        <div class="mt-6 space-y-4 text-sm leading-relaxed text-ink-soft">
          <p>
            ColivinApp es una plataforma de renta mensual de habitaciones. Al crear una cuenta te
            comprometes a usar datos veraces, respetar a las demás personas y no publicar
            información engañosa.
          </p>
          <p>
            Las solicitudes de plaza las revisa cada anfitrión. Aceptar una solicitud ocupa una
            plaza; rechazarla o cancelarla no la ocupa. Las condiciones económicas se acuerdan entre
            anfitrión y huésped.
          </p>
          <p>
            Podemos suspender cuentas que incumplan estas normas o intenten perjudicar a otras
            personas. Estas condiciones describen el funcionamiento del piloto y pueden actualizarse
            antes de la versión definitiva.
          </p>
        </div>
      } @else {
        <h1 class="mt-6 font-display text-3xl font-extrabold tracking-tight text-ink">
          Política de privacidad
        </h1>
        <div class="mt-6 space-y-4 text-sm leading-relaxed text-ink-soft">
          <p>
            Usamos tu correo para crear y proteger la cuenta, verificar tu identidad y enviarte
            avisos relacionados con tus solicitudes. Tu teléfono y tus preferencias solo se
            comparten según los permisos que configures en tu perfil.
          </p>
          <p>
            La dirección exacta de una vivienda no se publica en las fichas públicas. Los documentos
            de verificación se revisan para acreditar identidad y no se muestran a otros usuarios.
          </p>
          <p>
            Puedes aceptar o revocar los consentimientos disponibles desde «Mi perfil». Si necesitas
            ejercer otros derechos sobre tus datos, contacta con el equipo de ColivinApp.
          </p>
        </div>
      }

      <p class="mt-8 text-xs text-muted">
        Documento informativo del piloto. La aceptación en el registro no sustituye los
        consentimientos que puedes gestionar desde tu perfil.
      </p>
    </main>
  `,
})
export class LegalPage {
  protected readonly kind = inject(ActivatedRoute).snapshot.data['document'] as 'terms' | 'privacy';
}
