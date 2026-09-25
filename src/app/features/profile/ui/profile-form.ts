import { Component, computed, inject, input, linkedSignal, output, signal } from '@angular/core';
import { FormField as SignalFormField, FormRoot, form, required } from '@angular/forms/signals';
import { toApiError } from '../../../core/http/api-error';
import { UiAlert } from '../../../shared/ui/alert';
import { UiButton } from '../../../shared/ui/button';
import { firstFieldError } from '../../../shared/ui/field-errors';
import { UiFormField } from '../../../shared/ui/form-field';
import { ProfileApi } from '../data-access/profile-api';
import { GuestType, ProfileView, UpdateProfilePayload } from '../models/profile-models';

interface ProfileFormModel {
  name: string;
  phone: string;
  guestType: GuestType | '';
  stayPreferences: string;
  // Referencias que aún no tienen catálogo público: se preservan tal cual.
  cityId: string | null;
  institutionId: string | null;
  facultyId: string | null;
  careerId: string | null;
  academicUnlisted: boolean;
}

function toModel(view: ProfileView): ProfileFormModel {
  return {
    name: view.name ?? '',
    phone: view.phone ?? '',
    guestType: view.guestType ?? '',
    stayPreferences: view.stayPreferenceCodes.join(', '),
    cityId: view.cityId,
    institutionId: view.institutionId,
    facultyId: view.facultyId,
    careerId: view.careerId,
    academicUnlisted: view.academicUnlisted,
  };
}

function splitCodes(value: string): string[] {
  return value
    .split(',')
    .map((code) => code.trim())
    .filter((code) => code !== '');
}

/** Formulario del perfil (RF-010/RF-011). Envía el perfil completo (contrato real del backend). */
@Component({
  selector: 'app-profile-form',
  imports: [UiAlert, UiButton, UiFormField, SignalFormField, FormRoot],
  templateUrl: './profile-form.html',
})
export class ProfileForm {
  readonly profile = input.required<ProfileView>();
  readonly saved = output<ProfileView>();

  private readonly profileApi = inject(ProfileApi);

  protected readonly submitting = signal(false);
  protected readonly success = signal(false);
  protected readonly serverError = signal<string | null>(null);
  protected readonly serverFieldErrors = signal<Record<string, string>>({});

  private readonly model = linkedSignal<ProfileFormModel>(() => toModel(this.profile()));

  protected readonly profileForm = form(
    this.model,
    (path) => {
      required(path.name, { message: 'El nombre es obligatorio.' });
    },
    {
      submission: {
        action: async () => {
          await this.save();
          return undefined;
        },
      },
    },
  );

  protected readonly nameError = computed(
    () => firstFieldError(this.profileForm.name) ?? this.serverFieldErrors()['name'] ?? null,
  );

  private async save(): Promise<void> {
    this.submitting.set(true);
    this.success.set(false);
    this.serverError.set(null);
    this.serverFieldErrors.set({});
    try {
      const model = this.model();
      const payload: UpdateProfilePayload = {
        name: model.name.trim() || null,
        phone: model.phone.trim() || null,
        guestType: model.guestType === '' ? null : model.guestType,
        cityId: model.cityId,
        institutionId: model.institutionId,
        facultyId: model.facultyId,
        careerId: model.careerId,
        academicUnlisted: model.academicUnlisted,
        stayPreferences: splitCodes(model.stayPreferences),
      };
      const updated = await this.profileApi.update(payload);
      this.saved.emit(updated);
      this.success.set(true);
    } catch (error) {
      const apiError = toApiError(error);
      this.serverFieldErrors.set(apiError.fieldErrors);
      this.serverError.set(apiError.message);
    } finally {
      this.submitting.set(false);
    }
  }
}
