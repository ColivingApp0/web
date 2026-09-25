import { Component, inject, input, linkedSignal, output, signal } from '@angular/core';
import { FormField as SignalFormField, FormRoot, form } from '@angular/forms/signals';
import { toApiError } from '../../../core/http/api-error';
import { UiAlert } from '../../../shared/ui/alert';
import { UiButton } from '../../../shared/ui/button';
import { ProfileApi } from '../data-access/profile-api';
import { ConfigurePrivacyPayload, ProfileView } from '../models/profile-models';

interface PrivacyModel {
  affinityVisible: boolean;
  academicVisible: boolean;
}

/** Visibilidad de afinidad y datos académicos (RF-013). Envía ambos valores (contrato real). */
@Component({
  selector: 'app-privacy-form',
  imports: [UiAlert, UiButton, SignalFormField, FormRoot],
  templateUrl: './privacy-form.html',
})
export class PrivacyForm {
  readonly profile = input.required<ProfileView>();
  readonly saved = output<ProfileView>();

  private readonly profileApi = inject(ProfileApi);

  protected readonly submitting = signal(false);
  protected readonly success = signal(false);
  protected readonly serverError = signal<string | null>(null);

  private readonly model = linkedSignal<PrivacyModel>(() => ({
    affinityVisible: this.profile().affinityVisible,
    academicVisible: this.profile().academicVisible,
  }));

  protected readonly privacyForm = form(this.model, {
    submission: {
      action: async () => {
        await this.save();
        return undefined;
      },
    },
  });

  private async save(): Promise<void> {
    this.submitting.set(true);
    this.success.set(false);
    this.serverError.set(null);
    try {
      const { affinityVisible, academicVisible } = this.model();
      const payload: ConfigurePrivacyPayload = { affinityVisible, academicVisible };
      const updated = await this.profileApi.configurePrivacy(payload);
      this.saved.emit(updated);
      this.success.set(true);
    } catch (error) {
      this.serverError.set(toApiError(error).message);
    } finally {
      this.submitting.set(false);
    }
  }
}
