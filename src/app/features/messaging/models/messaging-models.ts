/**
 * Contratos del contexto `messaging` (RF-050, RF-051 y RF-052), tal como los
 * exponen `api/.../messaging/presentation` y `application/dto`.
 *
 * Hechos verificados que condicionan la UI:
 * - **Una conversación por reserva** (se abre de forma idempotente) y **sin estados**.
 * - Los **mensajes son inmutables**: no hay edición ni borrado.
 * - **No hay estado de lectura por mensaje**: la lectura solo existe a nivel de
 *   **notificación** (`readAt`/`unread`).
 * - **No hay paginación en ningún endpoint**: los mensajes y las notificaciones
 *   llegan completos (deuda técnica documentada).
 * - El hilo solo conoce las **fechas de la estancia**; no expone la unidad ni la
 *   publicación, y no existe endpoint que resuelva el nombre de la contraparte.
 */

/** Único tipo de notificación definido hoy (`NotificationType`). */
export type NotificationType = 'MENSAJE_NUEVO';

/** Respuesta de los envíos de mensaje (`MessageView`). */
export interface MessageView {
  id: string;
  conversationId: string;
  senderUserId: string;
  body: string;
  sentAt: string;
}

/** Resumen de hilo (`ConversationView`); nuevo primero cuando se lista. */
export interface ConversationView {
  id: string;
  reservationId: string | null;
  unitId: string | null;
  publicationId: string | null;
  subject: string | null;
  guestUserId: string;
  hostUserId: string;
  createdAt: string;
  lastMessageAt: string | null;
  messageCount: number;
  roomTitle: string | null;
  propertyTitle: string | null;
  cityName: string | null;
}

/** Contexto de la habitación del hilo (resuelto por accommodation). */
export interface ListingContextView {
  unitId: string | null;
  publicationId: string | null;
  roomTitle: string | null;
  propertyTitle: string | null;
  cityName: string | null;
  reservationId: string | null;
}

/** Respuesta de `GET /conversations/{id}` y `POST /conversations`. */
export interface ConversationDetailView {
  conversation: ConversationView;
  listing: ListingContextView;
  messages: MessageView[];
}

/** Notificación in-app (`NotificationView`); `title` es genérico y sin contenido. */
export interface NotificationView {
  id: string;
  type: NotificationType;
  title: string;
  /** Apunta al hilo relacionado (`referenceId` = conversación). */
  referenceId: string;
  createdAt: string;
  readAt: string | null;
  unread: boolean;
}

/** Bandeja con el contador que alimenta el estado de no leídas (`NotificationInboxView`). */
export interface NotificationInboxView {
  unreadCount: number;
  notifications: NotificationView[];
}

/** Bloqueo levantado por el usuario autenticado (`BlockView`). */
export interface BlockView {
  blockedUserId: string;
  createdAt: string;
}

/** Reporte de conversación con su caso de moderación (`ConversationReportView`). */
export interface ConversationReportView {
  id: string;
  conversationId: string;
  reportedUserId: string;
  reason: string;
  caseId: string;
  createdAt: string;
}

/** Cuerpo de `POST /api/v1/conversations`: solicitud o habitación. */
export interface OpenConversationPayload {
  reservationId?: string;
  unitId?: string;
}

/** Cuerpo de los endpoints de envío (`SendMessageRequest`). */
export interface SendMessagePayload {
  body: string;
}

/** Límite real del cuerpo de un mensaje (`Message.MAX_BODY_LENGTH`). */
export const MESSAGE_MAX_LENGTH = 2000;

/** Límite real del motivo de un reporte (`ConversationReport.MAX_REASON_LENGTH`). */
export const REPORT_REASON_MAX_LENGTH = 1000;

/** Título que envía el backend para un mensaje nuevo (`Notification.NEW_MESSAGE_TITLE`). */
export const NEW_MESSAGE_TITLE = 'Tienes un nuevo mensaje';

export const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
  MENSAJE_NUEVO: 'Mensaje nuevo',
};

/** Título legible del hilo a partir del contexto real. */
export function conversationTitle(conversation: ConversationView): string {
  const room = conversation.roomTitle;
  const property = conversation.propertyTitle;
  if (room && property) return `${room} · ${property}`;
  if (room) return room;
  if (conversation.subject) return conversation.subject;
  return conversation.reservationId ? 'Conversación de la solicitud' : 'Conversación';
}

/** ¿El usuario es una de las dos partes del hilo? (misma regla que el dominio). */
export function isParticipant(conversation: ConversationView, userId: string): boolean {
  return conversation.guestUserId === userId || conversation.hostUserId === userId;
}

/** La otra parte del hilo, o `null` si el usuario no participa en él. */
export function counterpartUserId(conversation: ConversationView, userId: string): string | null {
  if (conversation.guestUserId === userId) {
    return conversation.hostUserId;
  }
  if (conversation.hostUserId === userId) {
    return conversation.guestUserId;
  }
  return null;
}

/** ¿El mensaje lo escribió el usuario autenticado? (para separar enviados/recibidos). */
export function isOwnMessage(message: MessageView, userId: string): boolean {
  return message.senderUserId === userId;
}

/**
 * Orden estable y sin duplicados para renderizar el hilo:
 * `sentAt` ascendente (el orden real del backend) con desempate por `id` —dos
 * mensajes pueden compartir instante— y descarte de ids repetidos, de modo que
 * añadir el mensaje devuelto por `send` y luego recargar no duplique nada.
 */
export function orderedMessages(messages: readonly MessageView[]): MessageView[] {
  const unique = new Map<string, MessageView>();
  for (const message of messages) {
    unique.set(message.id, message);
  }
  return [...unique.values()].sort((a, b) => {
    if (a.sentAt === b.sentAt) {
      return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
    }
    return a.sentAt < b.sentAt ? -1 : 1;
  });
}

/** Última actividad del hilo: el último mensaje o, si no hay, su creación. */
export function lastActivityAt(conversation: ConversationView): string {
  return conversation.lastMessageAt ?? conversation.createdAt;
}

/** Error de validación del cuerpo del mensaje (espejo de las reglas del backend). */
export function messageBodyError(body: string): string | null {
  const normalized = body.trim();
  if (normalized.length === 0) {
    return 'Escribe un mensaje antes de enviarlo.';
  }
  return normalized.length > MESSAGE_MAX_LENGTH
    ? `El mensaje no puede superar los ${MESSAGE_MAX_LENGTH} caracteres.`
    : null;
}

/** Error de validación del motivo del reporte (1..1000, obligatorio). */
export function reportReasonError(reason: string): string | null {
  const normalized = reason.trim();
  if (normalized.length === 0) {
    return 'Indica el motivo del reporte.';
  }
  return normalized.length > REPORT_REASON_MAX_LENGTH
    ? `El motivo no puede superar los ${REPORT_REASON_MAX_LENGTH} caracteres.`
    : null;
}

/** Etiqueta del contador de no leídas (texto real, sin inventar cifras). */
export function unreadLabel(unreadCount: number): string {
  if (unreadCount === 0) {
    return 'Sin notificaciones nuevas';
  }
  return unreadCount === 1 ? '1 notificación sin leer' : `${unreadCount} notificaciones sin leer`;
}
