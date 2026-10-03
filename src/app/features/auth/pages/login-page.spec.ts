import { HttpErrorResponse } from '@angular/common/http';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { SessionApi } from '../../../core/auth/session-api';
import { LoginPage } from './login-page';

@Component({ template: '' })
class DummyPage {}

const loginSuccess = {
  token: 'raw-token',
  expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
  user: {
    userId: 'u1',
    email: 'ada@example.com',
    emailVerified: true,
    status: 'ACTIVE',
    activeRoles: [],
  },
};

function setup() {
  const api = {
    login: vi.fn(),
    logout: vi.fn(),
    me: vi.fn(),
    selectRole: vi.fn(),
  };
  TestBed.configureTestingModule({
    imports: [LoginPage],
    providers: [
      provideRouter([
        { path: 'perfil', component: DummyPage },
        { path: 'seleccionar-rol', component: DummyPage },
      ]),
      { provide: SessionApi, useValue: api },
    ],
  });
  return { api, router: TestBed.inject(Router) };
}

function fillLogin(
  fixture: ReturnType<typeof TestBed.createComponent<LoginPage>>,
  email: string,
  password: string,
) {
  const emailInput = (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>(
    '#email',
  )!;
  const passwordInput = (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>(
    '#password',
  )!;
  emailInput.value = email;
  emailInput.dispatchEvent(new Event('input'));
  passwordInput.value = password;
  passwordInput.dispatchEvent(new Event('input'));
}

async function submit(fixture: ReturnType<typeof TestBed.createComponent<LoginPage>>) {
  const form = (fixture.nativeElement as HTMLElement).querySelector('form')!;
  form.dispatchEvent(new Event('submit'));
  await fixture.whenStable();
}

describe('LoginPage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should render accessible labeled fields', async () => {
    setup();
    const fixture = TestBed.createComponent(LoginPage);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('label[for="email"]')?.textContent).toContain(
      'Correo electrónico',
    );
    expect(compiled.querySelector('label[for="password"]')?.textContent).toContain('Contraseña');
    expect(compiled.querySelector('input[autocomplete="current-password"]')).not.toBeNull();
  });

  it('should not call the API when the form is invalid', async () => {
    const { api } = setup();
    const fixture = TestBed.createComponent(LoginPage);
    await fixture.whenStable();

    await submit(fixture);

    expect(api.login).not.toHaveBeenCalled();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('El correo es obligatorio.');
  });

  it('should login and navigate to the profile when the user already has a role', async () => {
    const { api, router } = setup();
    api.login.mockResolvedValue({
      ...loginSuccess,
      user: {
        ...loginSuccess.user,
        activeRoles: [{ id: 'r1', code: 'ANFITRION', name: 'Anfitrión' }],
      },
    });
    const navigate = vi.spyOn(router, 'navigateByUrl');
    const fixture = TestBed.createComponent(LoginPage);
    await fixture.whenStable();
    fillLogin(fixture, 'ada@example.com', 'secret123');

    await submit(fixture);
    await vi.waitFor(() => expect(navigate).toHaveBeenCalled());

    expect(api.login).toHaveBeenCalledWith('ada@example.com', 'secret123');
    expect(navigate).toHaveBeenCalledWith('/perfil');
  });

  it('should show a server error when credentials are invalid', async () => {
    const { api } = setup();
    api.login.mockRejectedValue(
      new HttpErrorResponse({
        status: 401,
        error: { code: 'UNAUTHORIZED', message: 'Invalid credentials' },
      }),
    );
    const fixture = TestBed.createComponent(LoginPage);
    await fixture.whenStable();
    fillLogin(fixture, 'ada@example.com', 'wrong-pass');

    await submit(fixture);
    await vi.waitFor(() =>
      expect((fixture.nativeElement as HTMLElement).textContent).toContain(
        'Correo o contraseña incorrectos.',
      ),
    );
  });
});
