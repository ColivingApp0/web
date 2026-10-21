import { Component, computed, inject, resource, signal } from '@angular/core';
import { FormField as SignalFormField, FormRoot, form, validate } from '@angular/forms/signals';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthSession } from '../../../core/auth/auth-session';
import { toApiError } from '../../../core/http/api-error';
import { UiAlert } from '../../../shared/ui/alert';
import { UiButton } from '../../../shared/ui/button';
import { firstFieldError } from '../../../shared/ui/field-errors';
import { UiFormField } from '../../../shared/ui/form-field';
import { MessagingApi } from '../data-access/messaging-api';
import {
  MESSAGE_MAX_LENGTH,
  MessageView,
  REPORT_REASON_MAX_LENGTH,
  counterpartUserId,
  isOwnMessage,
  conversationTitle,
  messageBodyError,
  orderedMessages,
  reportReasonError,
} from '../models/messaging-models';
import { MessageBubble } from '../ui/message-bubble';

interface ComposerModel {
  body: string;
}

interface ReportModel {
  reason: string;
}

/**
 * Hilo de una reserva (`GET /conversations/{id}`): cabecera con la estancia,
 * mensajes en orden cronológico estable y sin duplicados, envío con los límites
 * reales (1..2000) y acciones de seguridad de RF-052 (reportar, bloquear).
 *
 * **Sin tiempo real**: no hay WebSocket/SSE/polling en el backend, así que la
 * frescura es bajo demanda — carga inicial, botón «Actualizar» y recarga después
 * de enviar. Un mensaje de la contraparte no aparece hasta actualizar.
 */
@Component({
  selector: 'app-conversation-page',
  imports: [RouterLink, UiAlert, UiButton, UiFormField, MessageBubble, SignalFormField, FormRoot],
  templateUrl: './conversation-page.html',
})
export class ConversationPage {
  private readonly route = inject(ActivatedRoute);
  private readonly session = inject(AuthSession);
  private readonly api = inject(MessagingApi);

  private readonly params = toSignal(this.route.paramMap, { requireSync: true });
  protected readonly conversationId = computed(() => this.params().get('id') ?? '');

  protected readonly conversationResource = resource({
    params: () => this.conversationId(),
    loader: ({ params }) => this.api.conversation(params),
  });

  protected readonly detail = computed(() => this.conversationResource.value() ?? null);
  protected readonly loading = computed(() => this.conversationResource.isLoading());
  protected readonly loadError = computed(() => {
    const error = this.conversationResource.error();
    if (!error) {
      return null;
    }
    const apiError = toApiError(error);
    return apiError.status === 403
      ? 'No eres parte de esta conversación.'
      : apiError.status === 404
        ? 'No encontramos esta conversación.'
        : apiError.message;
  });

  protected readonly myUserId = computed(() => this.session.user()?.userId ?? '');
  protected readonly listing = computed(() => this.detail()?.listing ?? null);
  protected readonly title = computed(() => {
    const detail = this.detail();
    return detail === null ? 'Conversación' : conversationTitle(detail.conversation);
  });
  protected readonly counterpart = computed(() => {
    const detail = this.detail();
    return detail === null ? null : counterpartUserId(detail.conversation, this.myUserId());
  });

  /** Mensajes enviados en esta visita, unidos a los del servidor (sin duplicar). */
  private readonly sentMessages = signal<MessageView[]>([]);
  protected readonly messages = computed(() =>
    orderedMessages([...(this.detail()?.messages ?? []), ...this.sentMessages()]),
  );
  protected readonly isEmpty = computed(
    () => !this.loading() && this.loadError() === null && this.messages().length === 0,
  );
  protected readonly maxLength = MESSAGE_MAX_LENGTH;

  protected isOwn(message: MessageView): boolean {
    return isOwnMessage(message, this.myUserId());
  }

  // ---------- Envío ----------

  private readonly composerModel = signal<ComposerModel>({ body: '' });

  protected readonly composerForm = form(
    this.composerModel,
    (path) => {
      validate(path.body, ({ value }) => {
        const error = messageBodyError(value());
        return error === null ? null : { kind: 'message-body', message: error };
      });
    },
    {
      submission: {
        action: async () => {
          await this.send();
          return undefined;
        },
      },
    },
  );

  protected readonly sending = signal(false);
  protected readonly bodyError = computed(() => firstFieldError(this.composerForm.body));
  protected readonly canSend = computed(() => !this.sending() && this.bodyError() === null);
  protected readonly draftLength = computed(() => this.composerModel().body.length);

  protected retry(): void {
    this.conversationResource.reload();
  }

  /**
   * Actualización explícita: el backend no ofrece tiempo real, así que este es el
   * único mecanismo para ver lo que escribió la contraparte.
   */
  protected refresh(): void {
    this.conversationResource.reload();
    this.reportsResource.reload();
    this.blocksResource.reload();
  }

  private async send(): Promise<void> {
    const detail = this.detail();
    if (detail === null) {
      this.actionError.set('La conversación aún no está cargada.');
      return;
    }
    this.sending.set(true);
    this.actionError.set(null);
    this.sendError.set(null);
    try {
      const created = await this.api.sendMessage(
        detail.conversation.id,
        this.composerModel().body.trim(),
      );
      this.sentMessages.update((current) => [...current, created]);
      this.composerModel.set({ body: '' });
      this.conversationResource.reload();
    } catch (error) {
      this.sendError.set(this.describeSendError(error));
      this.conversationResource.reload();
    } finally {
      this.sending.set(false);
    }
  }

  /** Traduce el 403 real del backend, que cubre bloqueo y terceros. */
  private describeSendError(error: unknown): string {
    const apiError = toApiError(error);
    if (apiError.status === 403) {
      return apiError.message.toLowerCase().includes('blocked')
        ? 'No se pudo enviar: hay un bloqueo entre vosotros, así que la conversación no admite mensajes nuevos. Puedes deshacer tu bloqueo más abajo o pedir ayuda con «Reportar».'
        : `No se pudo enviar (${apiError.code}): ${apiError.message}.`;
    }
    if (apiError.status === 404) {
      return 'No se pudo enviar: la conversación ya no existe. Actualiza la página.';
    }
    return apiError.message;
  }

  // ---------- Estado de acciones ----------

  protected readonly actionError = signal<string | null>(null);
  protected readonly sendError = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);

  // ---------- Reportes (RF-052) ----------

  private readonly reportsResource = resource({ loader: () => this.api.listMyReports() });

  /** Reporte del usuario sobre **esta** conversación (solo se admite uno). */
  protected readonly myReport = computed(() => {
    const detail = this.detail();
    if (detail === null) {
      return null;
    }
    return (
      (this.reportsResource.value() ?? []).find(
        (report) => report.conversationId === detail.conversation.id,
      ) ?? null
    );
  });

  protected readonly showReportForm = signal(false);
  private readonly reportModel = signal<ReportModel>({ reason: '' });

  protected readonly reportForm = form(
    this.reportModel,
    (path) => {
      validate(path.reason, ({ value }) => {
        const error = reportReasonError(value());
        return error === null ? null : { kind: 'report-reason', message: error };
      });
    },
    {
      submission: {
        action: async () => {
          await this.submitReport();
          return undefined;
        },
      },
    },
  );

  protected readonly reportReasonFieldError = computed(() =>
    firstFieldError(this.reportForm.reason),
  );
  protected readonly reporting = signal(false);
  protected readonly reportError = signal<string | null>(null);
  protected readonly reportSuccess = signal<string | null>(null);
  protected readonly reportMaxLength = REPORT_REASON_MAX_LENGTH;
  protected readonly reportReasonLength = computed(() => this.reportModel().reason.length);

  protected toggleReportForm(): void {
    this.reportError.set(null);
    this.showReportForm.update((visible) => !visible);
  }

  private async submitReport(): Promise<void> {
    const detail = this.detail();
    if (detail === null) {
      return;
    }
    this.reporting.set(true);
    this.reportError.set(null);
    this.reportSuccess.set(null);
    this.actionError.set(null);
    try {
      const report = await this.api.reportConversation(
        detail.conversation.id,
        this.reportModel().reason.trim(),
      );
      this.reportSuccess.set(`Reporte registrado. Moderación revisará el caso ${report.caseId}.`);
      this.reportModel.set({ reason: '' });
      this.showReportForm.set(false);
      this.reportsResource.reload();
    } catch (error) {
      const apiError = toApiError(error);
      this.reportError.set(
        apiError.status === 409
          ? 'Ya reportaste esta conversación: el contrato admite un único reporte por conversación y persona.'
          : apiError.message,
      );
      if (apiError.status === 409) {
        this.reportsResource.reload();
      }
    } finally {
      this.reporting.set(false);
    }
  }

  // ---------- Bloqueos (RF-052) ----------

  private readonly blocksResource = resource({ loader: () => this.api.listMyBlocks() });

  /** Solo podemos saber si **nosotros** bloqueamos: la otra dirección la aplica el servidor. */
  protected readonly counterpartBlocked = computed(() => {
    const counterpart = this.counterpart();
    return (
      counterpart !== null &&
      (this.blocksResource.value() ?? []).some((block) => block.blockedUserId === counterpart)
    );
  });
  protected readonly blocking = signal(false);

  protected async blockCounterpart(): Promise<void> {
    const counterpart = this.counterpart();
    if (counterpart === null) {
      return;
    }
    this.blocking.set(true);
    this.actionError.set(null);
    this.successMessage.set(null);
    try {
      await this.api.blockUser(counterpart);
      this.successMessage.set(
        'Usuario bloqueado: no podrá escribir en vuestras conversaciones (leer sigue permitido).',
      );
      this.blocksResource.reload();
    } catch (error) {
      const apiError = toApiError(error);
      this.actionError.set(
        apiError.status === 409
          ? 'Ese usuario ya estaba bloqueado.'
          : apiError.status >= 500
            ? 'El servidor no pudo crear el bloqueo (500): la tabla de bloqueos del backend exige una conversación y el endpoint de bloqueo no la envía, así que esta acción no está operativa todavía. «Reportar conversación» sí funciona mientras tanto.'
            : apiError.message,
      );
      this.blocksResource.reload();
    } finally {
      this.blocking.set(false);
    }
  }

  protected async unblockCounterpart(): Promise<void> {
    const counterpart = this.counterpart();
    if (counterpart === null) {
      return;
    }
    this.blocking.set(true);
    this.actionError.set(null);
    this.successMessage.set(null);
    try {
      await this.api.unblockUser(counterpart);
      this.successMessage.set('Bloqueo retirado: podéis volver a escribiros.');
      this.blocksResource.reload();
    } catch (error) {
      const apiError = toApiError(error);
      this.actionError.set(
        apiError.status === 404 ? 'Ese usuario no estaba bloqueado.' : apiError.message,
      );
      this.blocksResource.reload();
    } finally {
      this.blocking.set(false);
    }
  }
}
