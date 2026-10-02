import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AuthSession } from './auth-session';
import { CurrentUserResult, LoginResult, RoleSummary, UserRoleSummary } from './identity-contract';
import { SessionApi } from './session-api';

const activeRole: UserRoleSummary = {
  id: 'ur1',
  roleId: 'r1',
  code: 'HUESPED_ESTUDIANTE',
  name: 'Huésped estudiante',
  active: true,
  assignedAt: '2026-10-01T10:00:00Z',
};

const loginResult = (): LoginResult => ({
  token: 'raw-token',
  expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
  user: {
    userId: 'u1',
    email: 'ada@example.com',
    emailVerified: true,
    status: 'ACTIVE',
    activeRoles: [] satisfies RoleSummary[],
  },
});

const currentUser = (withRole = false): CurrentUserResult => ({
  userId: 'u1',
  email: 'ada@example.com',
  emailVerified: true,
  status: 'ACTIVE',
  roles: withRole ? [activeRole] : [],
  activeRole: withRole ? activeRole : null,
  consents: [],
  documents: [],
});

function setup() {
  const api = {
    login: vi.fn(),
    logout: vi.fn().mockResolvedValue(undefined),
    me: vi.fn().mockResolvedValue(currentUser()),
    selectRole: vi.fn(),
  };
  TestBed.configureTestingModule({
    providers: [
      { provide: SessionApi, useValue: api },
      { provide: PLATFORM_ID, useValue: 'browser' },
    ],
  });
  return { session: TestBed.inject(AuthSession), api };
}

describe('AuthSession', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should persist a session on login and refresh the current user', async () => {
    const { session, api } = setup();

    session.setSession(loginResult());

    expect(session.isAuthenticated()).toBe(true);
    expect(localStorage.getItem('colivinapp.session')).toContain('raw-token');
    await vi.waitFor(() => expect(session.user()?.email).toBe('ada@example.com'));
    expect(api.me).toHaveBeenCalled();
  });

  it('should restore a persisted, non-expired session', () => {
    const { session } = setup();
    localStorage.setItem(
      'colivinapp.session',
      JSON.stringify({
        token: 'stored-token',
        expiresAt: loginResult().expiresAt,
        user: currentUser(),
      }),
    );

    session.restore();

    expect(session.isAuthenticated()).toBe(true);
    expect(session.token()).toBe('stored-token');
    expect(session.user()?.email).toBe('ada@example.com');
  });

  it('should discard expired or corrupt persisted sessions', () => {
    const { session } = setup();
    localStorage.setItem(
      'colivinapp.session',
      JSON.stringify({ token: 'old', expiresAt: '2000-01-01T00:00:00Z', user: null }),
    );

    session.restore();

    expect(session.isAuthenticated()).toBe(false);
    expect(localStorage.getItem('colivinapp.session')).toBeNull();

    localStorage.setItem('colivinapp.session', 'not-json');
    session.restore();
    expect(localStorage.getItem('colivinapp.session')).toBeNull();
  });

  it('should clear the session on logout even if the API fails', async () => {
    const { session, api } = setup();
    api.logout.mockRejectedValueOnce(new Error('network'));
    session.setSession(loginResult());

    await session.logout();

    expect(session.isAuthenticated()).toBe(false);
    expect(localStorage.getItem('colivinapp.session')).toBeNull();
  });

  it('should reflect the new active role after selectRole', async () => {
    const { session, api } = setup();
    api.me.mockResolvedValue(currentUser());
    api.selectRole.mockResolvedValue({ userId: 'u1', activeRole });
    session.setSession(loginResult());

    await session.selectRole('HUESPED_ESTUDIANTE');

    expect(session.activeRole()?.code).toBe('HUESPED_ESTUDIANTE');
  });
});
