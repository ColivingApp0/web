import { Component, computed, inject, input, output, signal } from '@angular/core';
import {
  FormField as SignalFormField,
  FormRoot,
  form,
  required,
  validate,
} from '@angular/forms/signals';
import { toApiError } from '../../../core/http/api-error';
import { UiAlert } from '../../../shared/ui/alert';
import { UiButton } from '../../../shared/ui/button';
import { firstFieldError } from '../../../shared/ui/field-errors';
import { UiFormField } from '../../../shared/ui/form-field';
import { CommunityApi } from '../data-access/community-api';
import {
  ACTIVITY_DESCRIPTION_MAX_LENGTH,
  ACTIVITY_TITLE_MAX_LENGTH,
  ActivityDetailView,
  HostPropertyRef,
  HostReservationRef,
  HostUnitRef,
  ResidentCandidate,
  activityCapacityError,
  activityDescriptionError,
  activityParticipantsError,
  activityScheduledAtError,
  activityTitleError,
  residentCandidates,
} from '../models/community-models';

interface ActivityModel {
  propertyId: string;
  title: string;
  description: string;
  /** Valor de `<input type="datetime-local">`. */
  scheduledAt: string;
  capacity: string;
}

/**
 * Alta de una actividad (RF-060). Las validaciones locales espejan el contrato
 * real (título ≤120, descripción ≤1000, fecha **futura**, cupo entero > 0, al
 * menos un residente habilitado); el backend sigue siendo la autoridad y su 400
 * (por ejemplo, habilitar a alguien fuera de la comunidad) se muestra tal cual.
 *
 * Los residentes habilitables se derivan de los datos propios del anfitrión
 * (`residentCandidates`), replicando la regla del backend.
 */
@Component({
  selector: 'app-create-activity-form',
  imports: [UiAlert, UiButton, UiFormField, SignalFormField, FormRoot],
  templateUrl: './create-activity-form.html',
})
export class CreateActivityForm {
  readonly properties = input.required<readonly HostPropertyRef[]>();
  readonly units = input.required<readonly HostUnitRef[]>();
  readonly reservations = input.required<readonly HostReservationRef[]>();

  readonly created = output<ActivityDetailView>();

  private readonly api = inject(CommunityApi);

  protected readonly titleMaxLength = ACTIVITY_TITLE_MAX_LENGTH;
  protected readonly descriptionMaxLength = ACTIVITY_DESCRIPTION_MAX_LENGTH;

  private readonly now = new Date();
  private readonly model = signal<ActivityModel>({
    propertyId: '',
    title: '',
    description: '',
    scheduledAt: '',
    capacity: '',
  });

  /** Residentes habilitables de la propiedad elegida (proyección del anfitrión). */
  protected readonly residents = computed<ResidentCandidate[]>(() => {
    const propertyId = this.model().propertyId;
    return propertyId === ''
      ? []
      : residentCandidates(propertyId, this.units(), this.reservations());
  });

  private readonly selectedParticipants = signal<string[]>([]);

  /** Valor del modelo del select (el `FieldTree` no es comparable con `''`). */
  protected readonly selectedPropertyId = computed(() => this.model().propertyId);

  protected readonly submitting = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly participantsError = signal<string | null>(null);

  protected readonly activityForm = form(
    this.model,
    (path) => {
      required(path.propertyId, { message: 'Elige la propiedad de la actividad.' });
      required(path.title, { message: 'Indica un título para la actividad.' });
      required(path.scheduledAt, { message: 'Indica la fecha y hora de la actividad.' });
      required(path.capacity, { message: 'Indica el cupo de la actividad.' });

      validate(path.title, ({ value }) => {
        const message = activityTitleError(value());
        return message === null ? null : { kind: 'title', message };
      });
      validate(path.description, ({ value }) => {
        const message = activityDescriptionError(value());
        return message === null ? null : { kind: 'description', message };
      });
      validate(path.scheduledAt, ({ value }) => {
        const message = activityScheduledAtError(value(), this.now);
        return message === null ? null : { kind: 'scheduled-at', message };
      });
      validate(path.capacity, ({ value }) => {
        const message = activityCapacityError(value());
        return message === null ? null : { kind: 'capacity', message };
      });
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

  protected readonly propertyError = computed(() => firstFieldError(this.activityForm.propertyId));
  protected readonly titleError = computed(() => firstFieldError(this.activityForm.title));
  protected readonly descriptionError = computed(() =>
    firstFieldError(this.activityForm.description),
  );
  protected readonly scheduledAtError = computed(() =>
    firstFieldError(this.activityForm.scheduledAt),
  );
  protected readonly capacityError = computed(() => firstFieldError(this.activityForm.capacity));

  protected isSelected(userId: string): boolean {
    return this.selectedParticipants().includes(userId);
  }

  protected onParticipantChange(userId: string, event: Event): void {
    const target = event.target;
    const checked = target instanceof HTMLInputElement && target.checked;
    this.selectedParticipants.update((current) =>
      checked ? [...new Set([...current, userId])] : current.filter((id) => id !== userId),
    );
    this.participantsError.set(null);
  }

  protected onPropertyChange(event: Event): void {
    const target = event.target;
    if (target instanceof HTMLSelectElement) {
      this.model.update((current) => ({ ...current, propertyId: target.value }));
      this.selectedParticipants.set([]);
      this.participantsError.set(null);
    }
  }

  private async submit(): Promise<void> {
    const participantsMessage = activityParticipantsError(this.selectedParticipants());
    if (participantsMessage !== null) {
      this.participantsError.set(participantsMessage);
      return;
    }
    this.submitting.set(true);
    this.error.set(null);
    const current = this.model();
    const description = current.description.trim();
    try {
      const created = await this.api.createActivity({
        propertyId: current.propertyId,
        title: current.title.trim(),
        description: description === '' ? null : description,
        scheduledAt: new Date(current.scheduledAt).toISOString(),
        capacity: Number(current.capacity),
        enabledParticipantIds: this.selectedParticipants(),
      });
      this.model.set({ propertyId: '', title: '', description: '', scheduledAt: '', capacity: '' });
      this.selectedParticipants.set([]);
      this.created.emit(created);
    } catch (error) {
      const apiError = toApiError(error);
      this.error.set(
        apiError.status === 400
          ? `El servidor rechazó los datos (${apiError.code}): ${apiError.message}.`
          : apiError.status === 403
            ? 'Solo el anfitrión de la propiedad puede crear sus actividades.'
            : apiError.status === 404
              ? 'No encontramos esa propiedad.'
              : apiError.message,
      );
    } finally {
      this.submitting.set(false);
    }
  }
}
