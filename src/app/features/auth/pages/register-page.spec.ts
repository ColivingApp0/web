import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthApi } from '../data-access/auth-api';
import { RegisterPage } from './register-page';

function setup() {
  const api = {
    register: vi.fn().mockResolvedValue({ userId: 'u1', emailVerified: false }),
  };
  TestBed.configureTestingModule({
    imports: [RegisterPage],
    providers: [provideRouter([]), { provide: AuthApi, useValue: api }],
  });
  return { api };
}

async function fill(
  fixture: ReturnType<typeof TestBed.createComponent<RegisterPage>>,
): Promise<void> {
  const host = fixture.nativeElement as HTMLElement;
  const email = host.querySelector<HTMLInputElement>('#email')!;
  email.value = 'ada@example.com';
  email.dispatchEvent(new Event('input'));
  const password = host.querySelector<HTMLInputElement>('#password')!;
  password.value = 'secret123';
  password.dispatchEvent(new Event('input'));
  await fixture.whenStable();
}

describe('RegisterPage', () => {
  it('should link the legal documents and explain where consent is recorded', async () => {
    setup();
    const fixture = TestBed.createComponent(RegisterPage);
    await fixture.whenStable();
    const host = fixture.nativeElement as HTMLElement;

    expect(host.querySelector('a[href="/terminos"]')).not.toBeNull();
    expect(host.querySelector('a[href="/privacidad"]')).not.toBeNull();
    expect(host.querySelector('input[type="checkbox"]')).toBeNull();
    expect(host.textContent).toContain('La aceptación de los consentimientos se registra');
  });

  it('should register with the real contract without inventing a consent payload', async () => {
    const { api } = setup();
    const fixture = TestBed.createComponent(RegisterPage);
    await fixture.whenStable();
    await fill(fixture);

    (fixture.nativeElement as HTMLElement)
      .querySelector('form')!
      .dispatchEvent(new Event('submit'));
    await vi.waitFor(() => expect(api.register).toHaveBeenCalledTimes(1));

    expect(api.register).toHaveBeenCalledWith({
      email: 'ada@example.com',
      password: 'secret123',
    });
  });
});
