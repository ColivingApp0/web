import { Component, computed, inject, input, output, signal } from '@angular/core';
import { FormField as SignalFormField, FormRoot, form, required } from '@angular/forms/signals';
import { RouterLink } from '@angular/router';
import { toApiError } from '../../../core/http/api-error';
import { UiAlert } from '../../../shared/ui/alert';
import { UiButton } from '../../../shared/ui/button';
import { firstFieldError } from '../../../shared/ui/field-errors';
import { UiFormField } from '../../../shared/ui/form-field';
import { HostApi } from '../data-access/host-api';
import {
  HostPublication,
  PUBLICATION_STATUS_CLASSES,
  PUBLICATION_STATUS_LABELS,
  PublicationActionOption,
  publicationActions,
} from '../models/host-models';

interface CreateModel {
  title: string;
}

/**
 * Ciclo de vida de la publicación de una unidad: crear (BORRADOR) y ejecutar
 * las transiciones reales del dominio. Al publicar, el backend exige
 * verificación COMPLETO del anfitrión (el CONFLICT se explica con enlace).
 *
 * Limitación real del backend (sin inventar endpoints): no existe GET de
 * publicaciones del anfitrión, así que tras recargar la página solo se pueden
 * gestionar las publicaciones creadas en la misma navegación.
 */
@Component({
  selector: 'app-host-publication-panel',
  imports: [RouterLink, UiAlert, UiButton, UiFormField, SignalFormField, FormRoot],
  templateUrl: './publication-panel.html',
})
export class HostPublicationPanel {
  readonly unitId = input.required<string>();
  readonly publication = input<HostPublication | null>(null);
  readonly created = output<HostPublication>();
  readonly changed = output<HostPublication>();

  private readonly api = inject(HostApi);

  protected readonly labels = PUBLICATION_STATUS_LABELS;
  protected readonly classes = PUBLICATION_STATUS_CLASSES;

  protected readonly creating = signal(false);
  protected readonly actionBusy = signal<string | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly publishGateHint = signal(false);
  protected readonly limitation = signal(false);

  private readonly model = signal<CreateModel>({ title: '' });

  protected readonly createForm = form(
    this.model,
    (path) => {
      required(path.title, { message: 'El título es obligatorio.' });
    },
    {
      submission: {
        action: async () => {
          await this.create();
          return undefined;
        },
      },
    },
  );

  protected readonly titleError = computed(() => firstFieldError(this.createForm.title));

  protected actions(): readonly PublicationActionOption[] {
    const publication = this.publication();
    return publication ? publicationActions(publication.status) : [];
  }

  protected async run(action: PublicationActionOption): Promise<void> {
    const publication = this.publication();
    if (!publication || this.actionBusy() !== null) return;
    this.actionBusy.set(action.action);
    this.error.set(null);
    this.publishGateHint.set(false);
    try {
      const updated = await this.api.runPublicationAction(publication.id, action.action);
      this.changed.emit(updated);
    } catch (error) {
      const apiError = toApiError(error);
      if (apiError.code === 'CONFLICT' && action.action === 'publish') {
        this.publishGateHint.set(true);
        this.error.set(
          'No pudimos publicar: tu cuenta necesita verificación completa (un documento aprobado) o la publicación no admite esta acción en su estado actual.',
        );
      } else {
        this.error.set(apiError.message);
      }
    } finally {
      this.actionBusy.set(null);
    }
  }

  private async create(): Promise<void> {
    this.creating.set(true);
    this.error.set(null);
    this.limitation.set(false);
    try {
      const publication = await this.api.createPublication(
        this.unitId(),
        this.model().title.trim(),
      );
      this.created.emit(publication);
    } catch (error) {
      const apiError = toApiError(error);
      if (apiError.code === 'CONFLICT') {
        this.limitation.set(true);
        this.error.set('Esta unidad ya tiene una publicación.');
      } else {
        this.error.set(apiError.message);
      }
    } finally {
      this.creating.set(false);
    }
  }
}
