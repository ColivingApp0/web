import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthSession } from '../../../core/auth/auth-session';
import { UiIcon } from '../../../shared/ui/icon';

interface NavLink {
  label: string;
  fragment: string;
}

const NAV_LINKS: readonly NavLink[] = [
  { label: 'Alojamientos', fragment: 'alojamientos' },
  { label: 'Comunidad', fragment: 'comunidad' },
  { label: 'Score', fragment: 'score' },
  { label: 'Cómo funciona', fragment: 'como-funciona' },
];

/** Cabecera pública de la landing: navegación por anclas y acceso/estado de sesión. */
@Component({
  selector: 'app-site-header',
  imports: [RouterLink, UiIcon],
  templateUrl: './site-header.html',
})
export class SiteHeader {
  protected readonly session = inject(AuthSession);
  protected readonly links = NAV_LINKS;
  protected readonly open = signal(false);

  protected toggle(): void {
    this.open.update((value) => !value);
  }

  protected close(): void {
    this.open.set(false);
  }
}
