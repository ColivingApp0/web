import { DatePipe } from '@angular/common';
import { Component, computed, inject, resource, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { toApiError } from '../../../core/http/api-error';
import { UiAlert } from '../../../shared/ui/alert';
import { UiButton } from '../../../shared/ui/button';
import { MessagingApi } from '../data-access/messaging-api';
import { pluralize } from '../../../shared/utils/plural';
import { conversationTitle, lastActivityAt } from '../models/messaging-models';

/**
 * Bandeja de conversaciones (`GET /conversations`): hilos donde el usuario es
 * huésped o anfitrión, con su número de mensajes y su última actividad.
 *
 * Estado mínimo: `resource()` para la lista y otro para los bloqueos; sin store
 * (el contador de no leídas vive donde se consulta: la bandeja de notificaciones).
 *
 * Nota de contrato: `ConversationView` **no** incluye las fechas de la estancia
 * (solo el detalle las trae), así que aquí se muestra actividad y volumen, no el
 * alojamiento; tampoco existe endpoint que resuelva el nombre de la contraparte.
 */
@Component({
  selector: 'app-conversations-page',
  imports: [RouterLink, DatePipe, UiAlert, UiButton],
  templateUrl: './conversations-page.html',
})
export class ConversationsPage {
  private readonly api = inject(MessagingApi);

  protected readonly listResource = resource({ loader: () => this.api.listConversations() });
  protected readonly conversations = computed(() => this.listResource.value() ?? []);
  protected readonly loading = computed(() => this.listResource.isLoading());
  protected readonly loadError = computed(() => {
    const error = this.listResource.error();
    return error ? toApiError(error).message : null;
  });

  private readonly blocksResource = resource({ loader: () => this.api.listMyBlocks() });
  protected readonly blocks = computed(() => this.blocksResource.value() ?? []);
  protected readonly blocksLoading = computed(() => this.blocksResource.isLoading());

  protected readonly actionError = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);
  protected readonly busyBlockedUserId = signal<string | null>(null);

  protected activityOf(conversation: Parameters<typeof lastActivityAt>[0]): string {
    return lastActivityAt(conversation);
  }

  protected messagesLabel(count: number): string {
    return pluralize(count, 'mensaje', 'mensajes');
  }

  protected titleOf(conversation: Parameters<typeof conversationTitle>[0]): string {
    return conversationTitle(conversation);
  }

  protected retry(): void {
    this.listResource.reload();
  }

  protected async unblock(blockedUserId: string): Promise<void> {
    this.actionError.set(null);
    this.successMessage.set(null);
    this.busyBlockedUserId.set(blockedUserId);
    try {
      await this.api.unblockUser(blockedUserId);
      this.successMessage.set(
        'Usuario desbloqueado: podéis volver a escribiros en la conversación.',
      );
      this.blocksResource.reload();
    } catch (error) {
      const apiError = toApiError(error);
      this.actionError.set(
        apiError.status === 404
          ? 'Ese usuario ya no estaba bloqueado; actualizamos la lista.'
          : apiError.message,
      );
      this.blocksResource.reload();
    } finally {
      this.busyBlockedUserId.set(null);
    }
  }
}
