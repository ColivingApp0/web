import { HttpClient } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { API_BASE } from '../../../core/http/api-base';
import {
  BlockView,
  ConversationDetailView,
  ConversationReportView,
  ConversationView,
  MessageView,
  NotificationInboxView,
  NotificationView,
} from '../models/messaging-models';

/**
 * Endpoints del contexto `messaging` (RF-050, RF-051, RF-052).
 *
 * Los controladores **no exigen rol**: cualquier usuario autenticado puede
 * llamarlos y es el servicio de aplicación quien decide si es parte del hilo
 * (403) o si el recurso existe (404). El gate de bloqueo al escribir vive en el
 * backend (`403 The conversation is blocked between these users`).
 *
 * No se usa `POST /reservations/{id}/messages` (atajo que abre el hilo y escribe
 * en un solo paso): la UI abre el hilo primero para poder mostrar su id y sus
 * mensajes; el endpoint queda disponible en el contrato.
 */
@Service()
export class MessagingApi {
  private readonly http = inject(HttpClient);

  // ---------- Conversaciones y mensajes ----------

  listConversations(): Promise<ConversationView[]> {
    return firstValueFrom(this.http.get<ConversationView[]>(`${API_BASE}/conversations`));
  }

  conversation(conversationId: string): Promise<ConversationDetailView> {
    return firstValueFrom(
      this.http.get<ConversationDetailView>(`${API_BASE}/conversations/${conversationId}`),
    );
  }

  sendMessage(conversationId: string, body: string): Promise<MessageView> {
    return firstValueFrom(
      this.http.post<MessageView>(`${API_BASE}/conversations/${conversationId}/messages`, { body }),
    );
  }

  /**
   * Crea el hilo de una reserva **y** escribe el primer mensaje.
   *
   * Es el único camino real para crear una conversación: `POST /conversations`
   * está roto en el backend actual (500 `HV000030`: `@NotBlank` aplicado a un
   * `UUID` en `OpenConversationRequest`), así que la UI abre el hilo enviando el
   * primer mensaje, que es además lo que el producto espera (RF-050: conversar
   * dentro de la solicitud). La respuesta trae el `conversationId` creado.
   */
  sendMessageToReservation(reservationId: string, body: string): Promise<MessageView> {
    return firstValueFrom(
      this.http.post<MessageView>(`${API_BASE}/reservations/${reservationId}/messages`, { body }),
    );
  }

  /**
   * `POST /conversations` (idempotente) **no se usa mientras el backend responda
   * 500**; se conserva aquí para cuando el defecto se corrija y para dejar
   * constancia del contrato. Ver la guía (§15) y la memoria del proyecto.
   */
  openConversation(reservationId: string): Promise<ConversationDetailView> {
    return firstValueFrom(
      this.http.post<ConversationDetailView>(`${API_BASE}/conversations`, { reservationId }),
    );
  }

  // ---------- Notificaciones ----------

  notificationsInbox(): Promise<NotificationInboxView> {
    return firstValueFrom(this.http.get<NotificationInboxView>(`${API_BASE}/notifications`));
  }

  markNotificationRead(notificationId: string): Promise<NotificationView> {
    return firstValueFrom(
      this.http.post<NotificationView>(`${API_BASE}/notifications/${notificationId}/read`, null),
    );
  }

  // ---------- Seguridad (RF-052) ----------

  reportConversation(conversationId: string, reason: string): Promise<ConversationReportView> {
    return firstValueFrom(
      this.http.post<ConversationReportView>(
        `${API_BASE}/conversations/${conversationId}/reports`,
        {
          reason,
        },
      ),
    );
  }

  listMyReports(): Promise<ConversationReportView[]> {
    return firstValueFrom(
      this.http.get<ConversationReportView[]>(`${API_BASE}/conversations/reports`),
    );
  }

  blockUser(blockedUserId: string): Promise<BlockView> {
    return firstValueFrom(
      this.http.post<BlockView>(`${API_BASE}/users/me/blocks`, { blockedUserId }),
    );
  }

  unblockUser(blockedUserId: string): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`${API_BASE}/users/me/blocks/${blockedUserId}`));
  }

  listMyBlocks(): Promise<BlockView[]> {
    return firstValueFrom(this.http.get<BlockView[]>(`${API_BASE}/users/me/blocks`));
  }
}
