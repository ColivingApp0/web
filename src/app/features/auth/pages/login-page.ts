import { Component, computed, inject, signal } from '@angular/core';
import {
  FormField as SignalFormField,
  FormRoot,
  email,
  form,
  required,
} from '@angular/forms/signals';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthSession } from '../../../core/auth/auth-session';
import { SessionApi } from '../../../core/auth/session-api';
import { ApiError, toApiError } from '../../../core/http/api-error';
import { UiAlert } from '../../../shared/ui/alert';
import { UiButton } from '../../../shared/ui/button';
import { firstFieldError } from '../../../shared/ui/field-errors';
import { UiFormField } from '../../../shared/ui/form-field';

interface LoginModel {
  email: string;
  password: string;
}

@Component({
  selector: 'app-login-page',
  imports: [RouterLink, UiButton, UiFormField, UiAlert, SignalFormField, FormRoot],
  templateUrl: './login-page.html',
})
export class LoginPage {
  private readonly session = inject(AuthSession);
  private readonly sessionApi = inject(SessionApi);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly submitting = signal(false);
  protected readonly serverError = signal<string | null>(null);
  protected readonly serverFieldErrors = signal<Record<string, string>>({});

  private readonly model = signal<LoginModel>({ email: '', password: '' });

  protected readonly loginForm = form(
    this.model,
    (path) => {
      required(path.email, { message: 'El correo es obligatorio.' });
      email(path.email, { message: 'Introduce un correo válido.' });
      required(path.password, { message: 'La contraseña es obligatoria.' });
    },
    {
      submission: {
        action: async () => {
          await this.submit();
          return undefined;
        },
      },
    },
  );

  protected readonly emailError = computed(
    () => firstFieldError(this.loginForm.email) ?? this.serverFieldErrors()['email'] ?? null,
  );
  protected readonly passwordError = computed(
    () => firstFieldError(this.loginForm.password) ?? this.serverFieldErrors()['password'] ?? null,
  );

  private async submit(): Promise<void> {
    this.submitting.set(true);
    this.serverError.set(null);
    this.serverFieldErrors.set({});
    try {
      const { email: userEmail, password } = this.model();
      const result = await this.sessionApi.login(userEmail, password);
      this.session.setSession(result);
      await this.router.navigateByUrl(this.nextUrl(result.user.activeRoles.length > 0));
    } catch (error) {
      const apiError = toApiError(error);
      this.serverFieldErrors.set(apiError.fieldErrors);
      this.serverError.set(this.messageFor(apiError));
    } finally {
      this.submitting.set(false);
    }
  }

  private nextUrl(hasRole: boolean): string {
    const requested = this.route.snapshot.queryParamMap.get('returnUrl');
    if (requested && requested.startsWith('/') && !requested.startsWith('//')) {
      return requested;
    }
    return hasRole ? '/perfil' : '/seleccionar-rol';
  }

  private messageFor(error: ApiError): string {
    switch (error.code) {
      case 'UNAUTHORIZED':
        return 'Correo o contraseña incorrectos.';
      case 'FORBIDDEN':
        return 'Tu cuenta no está activa todavía. Verifica tu correo para poder iniciar sesión.';
      case 'VALIDATION_ERROR':
        return 'Revisa los datos del formulario.';
      default:
        return error.message;
    }
  }
}
