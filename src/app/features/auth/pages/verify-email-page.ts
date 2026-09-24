import { Component, computed, inject, signal } from '@angular/core';
import { FormField as SignalFormField, FormRoot, form, required } from '@angular/forms/signals';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiError, toApiError } from '../../../core/http/api-error';
import { UiAlert } from '../../../shared/ui/alert';
import { UiButton } from '../../../shared/ui/button';
import { firstFieldError } from '../../../shared/ui/field-errors';
import { UiFormField } from '../../../shared/ui/form-field';
import { AuthApi } from '../data-access/auth-api';

interface VerifyModel {
  token: string;
}

@Component({
  selector: 'app-verify-email-page',
  imports: [RouterLink, UiButton, UiFormField, UiAlert, SignalFormField, FormRoot],
  templateUrl: './verify-email-page.html',
})
export class VerifyEmailPage {
  private readonly authApi = inject(AuthApi);
  private readonly route = inject(ActivatedRoute);

  protected readonly submitting = signal(false);
  protected readonly verified = signal(false);
  protected readonly serverError = signal<string | null>(null);

  private readonly model = signal<VerifyModel>({
    token: this.route.snapshot.queryParamMap.get('token') ?? '',
  });

  protected readonly verifyForm = form(
    this.model,
    (path) => {
      required(path.token, { message: 'El token es obligatorio.' });
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

  protected readonly tokenError = computed(() => firstFieldError(this.verifyForm.token));

  private async submit(): Promise<void> {
    this.submitting.set(true);
    this.serverError.set(null);
    try {
      await this.authApi.verifyEmail(this.model().token.trim());
      this.verified.set(true);
    } catch (error) {
      this.serverError.set(this.messageFor(toApiError(error)));
    } finally {
      this.submitting.set(false);
    }
  }

  private messageFor(error: ApiError): string {
    switch (error.code) {
      case 'INVALID_ARGUMENT':
        return 'El token no es válido o ha expirado. Vuelve a registrarte para recibir uno nuevo.';
      case 'CONFLICT':
        return 'Este token ya fue utilizado. Tu correo ya está verificado: inicia sesión.';
      case 'VALIDATION_ERROR':
        return 'Introduce el token de verificación.';
      default:
        return error.message;
    }
  }
}
