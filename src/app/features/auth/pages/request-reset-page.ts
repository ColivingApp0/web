import { Component, computed, inject, signal } from '@angular/core';
import {
  FormField as SignalFormField,
  FormRoot,
  email,
  form,
  required,
} from '@angular/forms/signals';
import { RouterLink } from '@angular/router';
import { toApiError } from '../../../core/http/api-error';
import { UiAlert } from '../../../shared/ui/alert';
import { UiButton } from '../../../shared/ui/button';
import { firstFieldError } from '../../../shared/ui/field-errors';
import { UiFormField } from '../../../shared/ui/form-field';
import { AuthApi } from '../data-access/auth-api';

interface RequestResetModel {
  email: string;
}

@Component({
  selector: 'app-request-reset-page',
  imports: [RouterLink, UiButton, UiFormField, UiAlert, SignalFormField, FormRoot],
  templateUrl: './request-reset-page.html',
})
export class RequestResetPage {
  private readonly authApi = inject(AuthApi);

  protected readonly submitting = signal(false);
  protected readonly sent = signal(false);
  protected readonly serverError = signal<string | null>(null);

  private readonly model = signal<RequestResetModel>({ email: '' });

  protected readonly requestForm = form(
    this.model,
    (path) => {
      required(path.email, { message: 'El correo es obligatorio.' });
      email(path.email, { message: 'Introduce un correo válido.' });
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

  protected readonly emailError = computed(() => firstFieldError(this.requestForm.email));

  private async submit(): Promise<void> {
    this.submitting.set(true);
    this.serverError.set(null);
    try {
      await this.authApi.requestPasswordReset(this.model().email.trim());
      this.sent.set(true);
    } catch (error) {
      this.serverError.set(toApiError(error).message);
    } finally {
      this.submitting.set(false);
    }
  }
}
