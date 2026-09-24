import { Component, computed, inject, signal } from '@angular/core';
import {
  FormField as SignalFormField,
  FormRoot,
  email,
  form,
  maxLength,
  minLength,
  required,
} from '@angular/forms/signals';
import { RouterLink } from '@angular/router';
import { ApiError, toApiError } from '../../../core/http/api-error';
import { UiAlert } from '../../../shared/ui/alert';
import { UiButton } from '../../../shared/ui/button';
import { firstFieldError } from '../../../shared/ui/field-errors';
import { UiFormField } from '../../../shared/ui/form-field';
import { AuthApi } from '../data-access/auth-api';

interface RegisterModel {
  email: string;
  password: string;
}

@Component({
  selector: 'app-register-page',
  imports: [RouterLink, UiButton, UiFormField, UiAlert, SignalFormField, FormRoot],
  templateUrl: './register-page.html',
})
export class RegisterPage {
  private readonly authApi = inject(AuthApi);

  protected readonly submitting = signal(false);
  protected readonly registered = signal(false);
  protected readonly serverError = signal<string | null>(null);
  protected readonly serverFieldErrors = signal<Record<string, string>>({});

  private readonly model = signal<RegisterModel>({ email: '', password: '' });

  protected readonly registerForm = form(
    this.model,
    (path) => {
      required(path.email, { message: 'El correo es obligatorio.' });
      email(path.email, { message: 'Introduce un correo válido.' });
      required(path.password, { message: 'La contraseña es obligatoria.' });
      minLength(path.password, 8, { message: 'La contraseña debe tener al menos 8 caracteres.' });
      maxLength(path.password, 72, { message: 'La contraseña no puede superar 72 caracteres.' });
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
    () => firstFieldError(this.registerForm.email) ?? this.serverFieldErrors()['email'] ?? null,
  );
  protected readonly passwordError = computed(
    () =>
      firstFieldError(this.registerForm.password) ?? this.serverFieldErrors()['password'] ?? null,
  );

  private async submit(): Promise<void> {
    this.submitting.set(true);
    this.serverError.set(null);
    this.serverFieldErrors.set({});
    try {
      const { email: userEmail, password } = this.model();
      await this.authApi.register({ email: userEmail, password });
      this.registered.set(true);
    } catch (error) {
      const apiError = toApiError(error);
      this.serverFieldErrors.set(apiError.fieldErrors);
      this.serverError.set(this.messageFor(apiError));
    } finally {
      this.submitting.set(false);
    }
  }

  private messageFor(error: ApiError): string {
    switch (error.code) {
      case 'CONFLICT':
        return 'Este correo ya está registrado. Inicia sesión o recupera tu contraseña.';
      case 'INVALID_ARGUMENT':
      case 'VALIDATION_ERROR':
        return 'Revisa el correo y la contraseña (mínimo 8 caracteres).';
      default:
        return error.message;
    }
  }
}
