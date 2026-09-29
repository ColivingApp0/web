import { Component, computed, inject, signal } from '@angular/core';
import { FormField as SignalFormField, FormRoot, form, validate } from '@angular/forms/signals';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { toApiError } from '../../../core/http/api-error';
import { UiAlert } from '../../../shared/ui/alert';
import { UiButton } from '../../../shared/ui/button';
import { firstFieldError } from '../../../shared/ui/field-errors';
import { UiFormField } from '../../../shared/ui/form-field';
import { MessagingApi } from '../data-access/messaging-api';
import { MESSAGE_MAX_LENGTH, messageBodyError } from '../models/messaging-models';

interface FirstMessageModel {
  body: string;
}

/**
 * Punto de entrada a la conversación de una reserva (`?reserva=<id>`, enlazado
 * desde «Mis reservas» y «Reservas recibidas», sin acoplar features).
 *
 * Contrato real verificado: **`POST /conversations` responde 500** en el backend
 * actual (`OpenConversationRequest.reservationId` usa `@NotBlank` sobre un
 * `UUID` ⇒ `HV000030`), así que el hilo se abre por el único camino que funciona:
 * `POST /reservations/{id}/messages`, que crea la conversación y escribe el
 * primer mensaje (y devuelve su `conversationId`). Antes de pedir el mensaje se
 * consulta `GET /conversations` para entrar directamente si el hilo ya existe.
 */
@Component({
  selector: 'app-open-conversation-page',
  imports: [RouterLink, UiAlert, UiButton, UiFormField, SignalFormField, FormRoot],
  templateUrl: './open-conversation-page.html',
})
export class OpenConversationPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(MessagingApi);

  private readonly queryParams = toSignal(this.route.queryParamMap, { requireSync: true });
  protected readonly reservationId = computed(() => this.queryParams().get('reserva') ?? '');
  protected readonly missingReservation = computed(() => this.reservationId() === '');

  protected readonly checking = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly notice = signal<string | null>(null);
  protected readonly starting = signal(false);
  protected readonly maxLength = MESSAGE_MAX_LENGTH;

  private readonly firstMessageModel = signal<FirstMessageModel>({ body: '' });

  protected readonly firstMessageForm = form(
    this.firstMessageModel,
    (path) => {
      validate(path.body, ({ value }) => {
        const error = messageBodyError(value());
        return error === null ? null : { kind: 'message-body', message: error };
      });
    },
    {
      submission: {
        action: async () => {
          await this.startThread();
          return undefined;
        },
      },
    },
  );

  protected readonly bodyError = computed(() => firstFieldError(this.firstMessageForm.body));
  protected readonly canStart = computed(() => !this.starting() && this.bodyError() === null);

  constructor() {
    void this.lookup();
  }

  /** ¿Existe ya el hilo de esta reserva? El listado llega completo (sin paginación). */
  private async lookup(): Promise<void> {
    if (this.missingReservation()) {
      this.checking.set(false);
      return;
    }
    try {
      const conversations = await this.api.listConversations();
      const existing = conversations.find(
        (conversation) => conversation.reservationId === this.reservationId(),
      );
      if (existing) {
        await this.router.navigate(['/mensajes', existing.id]);
        return;
      }
    } catch (error) {
      this.notice.set(
        `No pudimos comprobar si la conversación ya existía (${toApiError(error).message}). Puedes escribir el primer mensaje igualmente.`,
      );
    } finally {
      this.checking.set(false);
    }
  }

  private async startThread(): Promise<void> {
    if (this.missingReservation()) {
      this.error.set('Falta la reserva: abre la conversación desde una de tus reservas.');
      return;
    }
    this.starting.set(true);
    this.error.set(null);
    try {
      const created = await this.api.sendMessageToReservation(
        this.reservationId(),
        this.firstMessageModel().body.trim(),
      );
      await this.router.navigate(['/mensajes', created.conversationId]);
    } catch (error) {
      const apiError = toApiError(error);
      this.error.set(
        apiError.status === 403
          ? 'Solo el huésped y el anfitrión de esa reserva pueden abrir esta conversación.'
          : apiError.status === 404
            ? 'No encontramos esa reserva.'
            : apiError.message,
      );
    } finally {
      this.starting.set(false);
    }
  }
}
