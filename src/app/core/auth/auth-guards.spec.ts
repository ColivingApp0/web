import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  Router,
  RouterStateSnapshot,
  UrlTree,
  provideRouter,
} from '@angular/router';
import { authGuard, guestGuard, roleGuard } from './auth-guards';
import { AuthSession } from './auth-session';
import { RoleCode } from './identity-contract';
import { SessionApi } from './session-api';

const route = {} as ActivatedRouteSnapshot;
const state = { url: '/perfil' } as RouterStateSnapshot;

const FUTURE = new Date(Date.now() + 86_400_000).toISOString();

function setup(authenticated: boolean) {
  TestBed.configureTestingModule({
    providers: [provideRouter([]), { provide: SessionApi, useValue: { me: vi.fn() } }],
  });
  const session = TestBed.inject(AuthSession);
  if (authenticated) {
    localStorage.setItem(
      'colivinapp.session',
      JSON.stringify({ token: 'raw-token', expiresAt: FUTURE, user: null }),
    );
    session.restore();
  }
  return { session, router: TestBed.inject(Router) };
}

describe('auth guards', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('authGuard should allow authenticated users', () => {
    setup(true);
    const result = TestBed.runInInjectionContext(() => authGuard(route, state));
    expect(result).toBe(true);
  });

  it('authGuard should redirect guests to login keeping the returnUrl', () => {
    const { router } = setup(false);
    const result = TestBed.runInInjectionContext(() => authGuard(route, state));
    expect(result).toBeInstanceOf(UrlTree);
    const url = router.serializeUrl(result as UrlTree);
    expect(url).toContain('/entrar');
    expect(url).toContain(encodeURIComponent('/perfil'));
  });

  it('guestGuard should allow guests', () => {
    setup(false);
    expect(TestBed.runInInjectionContext(() => guestGuard(route, state))).toBe(true);
  });

  it('guestGuard should send authenticated users to the profile', () => {
    const { router } = setup(true);
    const result = TestBed.runInInjectionContext(() => guestGuard(route, state));
    expect(result).toBeInstanceOf(UrlTree);
    expect(router.serializeUrl(result as UrlTree)).toContain('/perfil');
  });
});

function seedWithRole(code: RoleCode): void {
  localStorage.setItem(
    'colivinapp.session',
    JSON.stringify({
      token: 'raw-token',
      expiresAt: FUTURE,
      user: {
        userId: 'u1',
        email: 'ada@example.com',
        emailVerified: true,
        status: 'ACTIVE',
        roles: [],
        activeRole: { id: 'ur1', roleId: 'r1', code, name: code, active: true, assignedAt: '' },
        consents: [],
        documents: [],
      },
    }),
  );
  TestBed.inject(AuthSession).restore();
}

describe('roleGuard', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should redirect unauthenticated users to login', () => {
    const { router } = setup(false);
    const result = TestBed.runInInjectionContext(() => roleGuard('ANFITRION')(route, state));
    expect(result).toBeInstanceOf(UrlTree);
    expect(router.serializeUrl(result as UrlTree)).toContain('/entrar');
  });

  it('should redirect users without the required active role to the profile', () => {
    const { router } = setup(true);
    const result = TestBed.runInInjectionContext(() => roleGuard('ANFITRION')(route, state));
    expect(result).toBeInstanceOf(UrlTree);
    expect(router.serializeUrl(result as UrlTree)).toContain('/perfil');
  });

  it('should allow users whose active role matches', () => {
    setup(false);
    seedWithRole('ANFITRION');
    expect(TestBed.runInInjectionContext(() => roleGuard('ANFITRION')(route, state))).toBe(true);
  });
});
