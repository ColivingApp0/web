import { DatePipe } from '@angular/common';
import { Component, computed, inject, resource, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { toApiError } from '../../../core/http/api-error';
import { PushNotifications } from '../../../core/push/push-notifications';
import { UiAlert } from '../../../shared/ui/alert';
import { UiButton } from '../../../shared/ui/button';
import { MessagingApi } from '../data-access/messaging-api';
import {
  NOTIFICATION_TYPE_LABELS,
  NotificationView,
  unreadLabel,
} from '../models/messaging-models';

/**
 * Centro de notificaciones in-app (`GET /notifications`, RF-051): bandeja con el
 * contador de no leídas y la marca de leído por notificación.
 *
 * El contador se muestra **aquí**, donde se consulta: no se promociona a `core`
 * ni se pinta en el shell (evitaría que `layout` dependa de una feature) y no
 * existe todavía una necesidad real de compartirlo entre páginas.
 *
 * El contrato no pagina: la bandeja llega completa (deuda técnica documentada) y
 * el `title` es genérico a propósito (sin contenido sensible), con `referenceId`
 * apuntando al hilo relacionado.
 */
@Component({
  selector: 'app-notifications-page',
  imports: [RouterLink, DatePipe, UiAlert, UiButton],
  templateUrl: './notifications-page.html',
})
export class NotificationsPage {
  private readonly api = inject(MessagingApi);
  private readonly push = inject(PushNotifications);

  protected readonly pushSupported = this.push.supported;
  protected readonly pushEnabled = this.push.enabled;
  protected readonly pushBusy = this.push.busy;
  protected readonly pushError = this.push.error;

  protected readonly inboxResource = resource({ loader: () => this.api.notificationsInbox() });
  protected readonly inbox = computed(() => this.inboxResource.value() ?? null);
  protected readonly notifications = computed(() => this.inbox()?.notifications ?? []);
  protected readonly unreadCount = computed(() => this.inbox()?.unreadCount ?? 0);
  protected readonly unreadText = computed(() => unreadLabel(this.unreadCount()));
  protected readonly loading = computed(() => this.inboxResource.isLoading());
  protected readonly loadError = computed(() => {
    const error = this.inboxResource.error();
    return error ? toApiError(error).message : null;
  });

  protected readonly typeLabels = NOTIFICATION_TYPE_LABELS;
  protected readonly busyNotificationId = signal<string | null>(null);
  protected readonly actionError = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);

  protected retry(): void {
    this.inboxResource.reload();
  }

  protected async enablePush(): Promise<void> {
    await this.push.enable();
  }

  protected async disablePush(): Promise<void> {
    await this.push.disable();
  }

  protected async markRead(notification: NotificationView): Promise<void> {
    this.actionError.set(null);
    this.successMessage.set(null);
    this.busyNotificationId.set(notification.id);
    try {
      await this.api.markNotificationRead(notification.id);
      this.successMessage.set('Notificación marcada como leída.');
      this.inboxResource.reload();
    } catch (error) {
      const apiError = toApiError(error);
      this.actionError.set(
        apiError.status === 403
          ? 'Esa notificación no es tuya.'
          : apiError.status === 404
            ? 'La notificación ya no existe; actualizamos la bandeja.'
            : apiError.message,
      );
      if (apiError.status === 404) {
        this.inboxResource.reload();
      }
    } finally {
      this.busyNotificationId.set(null);
    }
  }
}
