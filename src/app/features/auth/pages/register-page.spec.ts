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
  acceptTerms: boolean,
): Promise<void> {
  const host = fixture.nativeElement as HTMLElement;
  const email = host.querySelector<HTMLInputElement>('#email')!;
  email.value = 'ada@example.com';
  email.dispatchEvent(new Event('input'));
  const password = host.querySelector<HTMLInputElement>('#password')!;
  password.value = 'secret123';
  password.dispatchEvent(new Event('input'));
  const terms = host.querySelector<HTMLInputElement>('input[type="checkbox"]')!;
  if (terms.checked !== acceptTerms) terms.click();
  await fixture.whenStable();
}

describe('RegisterPage', () => {
  it('should show terms and privacy links next to an explicit acceptance', async () => {
    setup();
    const fixture = TestBed.createComponent(RegisterPage);
    await fixture.whenStable();
    const host = fixture.nativeElement as HTMLElement;

    expect(host.querySelector('a[href="/terminos"]')).not.toBeNull();
    expect(host.querySelector('a[href="/privacidad"]')).not.toBeNull();
    expect(host.querySelector('input[type="checkbox"]')).not.toBeNull();
  });

  it('should not register until the terms are accepted', async () => {
    const { api } = setup();
    const fixture = TestBed.createComponent(RegisterPage);
    await fixture.whenStable();
    await fill(fixture, false);

    (fixture.nativeElement as HTMLElement)
      .querySelector('form')!
      .dispatchEvent(new Event('submit'));
    await fixture.whenStable();

    expect(api.register).not.toHaveBeenCalled();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Acepta los términos');
  });

  it('should register with the real contract without inventing a consent payload', async () => {
    const { api } = setup();
    const fixture = TestBed.createComponent(RegisterPage);
    await fixture.whenStable();
    await fill(fixture, true);

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
