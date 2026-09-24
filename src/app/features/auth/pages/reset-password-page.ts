import { Component, computed, inject, signal } from '@angular/core';
import {
  FormField as SignalFormField,
  FormRoot,
  form,
  maxLength,
  minLength,
  required,
} from '@angular/forms/signals';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiError, toApiError } from '../../../core/http/api-error';
import { UiAlert } from '../../../shared/ui/alert';
import { UiButton } from '../../../shared/ui/button';
import { firstFieldError } from '../../../shared/ui/field-errors';
import { UiFormField } from '../../../shared/ui/form-field';
import { AuthApi } from '../data-access/auth-api';

interface ResetPasswordModel {
  token: string;
  newPassword: string;
}

@Component({
  selector: 'app-reset-password-page',
  imports: [RouterLink, UiButton, UiFormField, UiAlert, SignalFormField, FormRoot],
  templateUrl: './reset-password-page.html',
})
export class ResetPasswordPage {
  private readonly authApi = inject(AuthApi);
  private readonly route = inject(ActivatedRoute);

  protected readonly submitting = signal(false);
  protected readonly done = signal(false);
  protected readonly serverError = signal<string | null>(null);

  private readonly model = signal<ResetPasswordModel>({
    token: this.route.snapshot.queryParamMap.get('token') ?? '',
    newPassword: '',
  });

  protected readonly resetForm = form(
    this.model,
    (path) => {
      required(path.token, { message: 'El token es obligatorio.' });
      required(path.newPassword, { message: 'La contraseña es obligatoria.' });
      minLength(path.newPassword, 8, {
        message: 'La contraseña debe tener al menos 8 caracteres.',
      });
      maxLength(path.newPassword, 72, { message: 'La contraseña no puede superar 72 caracteres.' });
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

  protected readonly tokenError = computed(() => firstFieldError(this.resetForm.token));
  protected readonly newPasswordError = computed(() => firstFieldError(this.resetForm.newPassword));

  private async submit(): Promise<void> {
    this.submitting.set(true);
    this.serverError.set(null);
    try {
      const { token, newPassword } = this.model();
      await this.authApi.resetPassword({ token: token.trim(), newPassword });
      this.done.set(true);
    } catch (error) {
      this.serverError.set(this.messageFor(toApiError(error)));
    } finally {
      this.submitting.set(false);
    }
  }

  private messageFor(error: ApiError): string {
    switch (error.code) {
      case 'INVALID_ARGUMENT':
        // El cliente ya valida la longitud de la contraseña: aquí el token es la causa real.
        return 'El token no es válido o ha expirado. Solicita uno nuevo en «Recuperar contraseña».';
      case 'VALIDATION_ERROR':
        return 'Revisa el token y la contraseña (mínimo 8 caracteres).';
      default:
        return error.message;
    }
  }
}
