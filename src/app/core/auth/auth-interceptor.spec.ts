import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { AuthSession } from './auth-session';
import { authInterceptor } from './auth-interceptor';
import { SessionApi } from './session-api';

@Component({ template: '' })
class DummyPage {}

const FUTURE = new Date(Date.now() + 86_400_000).toISOString();

function seedSession(): void {
  localStorage.setItem(
    'colivinapp.session',
    JSON.stringify({ token: 'raw-token', expiresAt: FUTURE, user: null }),
  );
}

function setup() {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([
        { path: 'perfil', component: DummyPage },
        { path: 'entrar', component: DummyPage },
      ]),
      provideHttpClient(withInterceptors([authInterceptor])),
      provideHttpClientTesting(),
      { provide: SessionApi, useValue: { me: vi.fn() } },
    ],
  });
  const session = TestBed.inject(AuthSession);
  session.restore();
  return {
    http: TestBed.inject(HttpClient),
    httpMock: TestBed.inject(HttpTestingController),
    router: TestBed.inject(Router),
    session,
  };
}

describe('authInterceptor', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
  });

  it('should attach the bearer token when a session exists', () => {
    seedSession();
    const { http, httpMock } = setup();

    http.get('/api/v1/notifications').subscribe();

    const request = httpMock.expectOne('/api/v1/notifications');
    expect(request.request.headers.get('Authorization')).toBe('Bearer raw-token');
    request.flush([]);
  });

  it('should not attach authorization without a session', () => {
    const { http, httpMock } = setup();

    http.get('/api/v1/notifications').subscribe({ error: () => undefined });

    const request = httpMock.expectOne('/api/v1/notifications');
    expect(request.request.headers.has('Authorization')).toBe(false);
    request.flush({ message: 'no' }, { status: 400, statusText: 'Bad Request' });
  });

  it('should clear the session and redirect to login on 401 in an authenticated area', async () => {
    seedSession();
    const { http, httpMock, router, session } = setup();
    await router.navigateByUrl('/perfil');
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    http.get('/api/v1/profile').subscribe({ error: () => undefined });
    httpMock
      .expectOne('/api/v1/profile')
      .flush({ message: 'Authentication required' }, { status: 401, statusText: 'Unauthorized' });

    expect(session.isAuthenticated()).toBe(false);
    expect(navigate).toHaveBeenCalledWith(['/entrar'], { queryParams: { returnUrl: '/perfil' } });
  });

  it('should not redirect on 401 from auth endpoints (form feedback)', async () => {
    const { http, httpMock, router } = setup();
    await router.navigateByUrl('/perfil');
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    http.post('/api/v1/auth/login', {}).subscribe({ error: () => undefined });
    httpMock
      .expectOne('/api/v1/auth/login')
      .flush(
        { code: 'UNAUTHORIZED', message: 'Invalid credentials' },
        { status: 401, statusText: 'Unauthorized' },
      );

    expect(navigate).not.toHaveBeenCalled();
  });
});
