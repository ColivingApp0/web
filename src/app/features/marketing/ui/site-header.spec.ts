import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthSession } from '../../../core/auth/auth-session';
import { SessionApi } from '../../../core/auth/session-api';
import { SiteHeader } from './site-header';

const FUTURE = new Date(Date.now() + 86_400_000).toISOString();

function setup(authenticated = false) {
  TestBed.configureTestingModule({
    imports: [SiteHeader],
    providers: [provideRouter([]), { provide: SessionApi, useValue: { me: vi.fn() } }],
  });
  if (authenticated) {
    localStorage.setItem(
      'colivinapp.session',
      JSON.stringify({ token: 'raw-token', expiresAt: FUTURE, user: null }),
    );
    TestBed.inject(AuthSession).restore();
  }
}

describe('SiteHeader', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should show access links for guests', async () => {
    setup();
    const fixture = TestBed.createComponent(SiteHeader);
    await fixture.whenStable();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(text).toContain('Iniciar sesión');
    expect(text).toContain('Regístrate');
  });

  it('should show the profile link for authenticated users', async () => {
    setup(true);
    const fixture = TestBed.createComponent(SiteHeader);
    await fixture.whenStable();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(text).toContain('Mi perfil');
    expect(text).not.toContain('Regístrate');
  });

  it('should toggle the mobile menu with accessible state', async () => {
    setup();
    const fixture = TestBed.createComponent(SiteHeader);
    await fixture.whenStable();
    const host = fixture.nativeElement as HTMLElement;
    const toggle = host.querySelector('button[aria-controls="mobile-menu"]')!;

    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(host.querySelector('#mobile-menu')).toBeNull();

    (toggle as HTMLButtonElement).click();
    await fixture.whenStable();

    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(host.querySelector('#mobile-menu')).not.toBeNull();
  });
});
