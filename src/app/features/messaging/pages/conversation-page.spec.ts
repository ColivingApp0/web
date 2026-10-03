import { HttpErrorResponse } from '@angular/common/http';
import { registerLocaleData } from '@angular/common';
import localeEsCo from '@angular/common/locales/es-CO';
import { LOCALE_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AuthSession } from '../../../core/auth/auth-session';
import { MessagingApi } from '../data-access/messaging-api';
import { ConversationDetailView, MessageView } from '../models/messaging-models';
import { ConversationPage } from './conversation-page';

registerLocaleData(localeEsCo);

function message(id: string, senderUserId: string, body: string, sentAt: string): MessageView {
  return { id, conversationId: 'c1', senderUserId, body, sentAt };
}

const detail: ConversationDetailView = {
  conversation: {
    id: 'c1',
    reservationId: 'r1',
    guestUserId: 'guest',
    hostUserId: 'host',
    createdAt: '2026-10-05T10:00:00Z',
    lastMessageAt: '2026-10-05T10:05:00Z',
    messageCount: 2,
  },
  stay: { reservationId: 'r1', fromDate: '2026-11-01', toDate: '2026-11-04' },
  messages: [
    message('m2', 'host', 'Sí, está libre', '2026-10-05T10:05:00Z'),
    message('m1', 'guest', 'Hola, ¿sigue libre?', '2026-10-05T10:00:00Z'),
  ],
};

interface SetupOptions {
  reports?: { id: string; conversationId: string; caseId: string }[];
  blocks?: { blockedUserId: string }[];
}

function setup(options: SetupOptions = {}) {
  const api = {
    conversation: vi.fn().mockResolvedValue(detail),
    listMyReports: vi.fn().mockResolvedValue(
      (options.reports ?? []).map((report) => ({
        id: report.id,
        conversationId: report.conversationId,
        reportedUserId: 'host',
        reason: 'Spam',
        caseId: report.caseId,
        createdAt: '2026-10-05T12:00:00Z',
      })),
    ),
    listMyBlocks: vi.fn().mockResolvedValue(options.blocks ?? []),
    sendMessage: vi
      .fn()
      .mockResolvedValue(message('m3', 'guest', 'Gracias, la reservo', '2026-10-05T10:10:00Z')),
    reportConversation: vi.fn().mockResolvedValue({
      id: 'rep1',
      conversationId: 'c1',
      reportedUserId: 'host',
      reason: 'Spam',
      caseId: 'case1',
      createdAt: '2026-10-05T12:10:00Z',
    }),
    blockUser: vi.fn().mockResolvedValue({ blockedUserId: 'host', createdAt: '' }),
    unblockUser: vi.fn().mockResolvedValue(undefined),
  };
  TestBed.configureTestingModule({
    imports: [ConversationPage],
    providers: [
      provideRouter([]),
      { provide: LOCALE_ID, useValue: 'es-CO' },
      { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ id: 'c1' })) } },
      { provide: AuthSession, useValue: { user: () => ({ userId: 'guest' }) } },
      { provide: MessagingApi, useValue: api },
    ],
  });
  return { api };
}

function typeInto(host: HTMLElement, selector: string, value: string): void {
  const field = host.querySelector<HTMLTextAreaElement>(selector)!;
  field.value = value;
  field.dispatchEvent(new Event('input'));
}

describe('ConversationPage', () => {
  it('should render the stay and the messages in chronological order', async () => {
    setup();
    const fixture = TestBed.createComponent(ConversationPage);
    await fixture.whenStable();
    const host = fixture.nativeElement as HTMLElement;
    const text = host.textContent ?? '';

    expect(text).toContain('1 nov 2026');
    expect(text).toContain('4 nov 2026');
    expect(text.indexOf('Hola, ¿sigue libre?')).toBeLessThan(text.indexOf('Sí, está libre'));
    expect(text).toContain('Contraparte');
    expect(text).toContain('Tú');
  });

  it('should send a message and reflect it without duplicating', async () => {
    const { api } = setup();
    const fixture = TestBed.createComponent(ConversationPage);
    await fixture.whenStable();
    const host = fixture.nativeElement as HTMLElement;

    typeInto(host, '#message-body', 'Gracias, la reservo');
    host.querySelector('form')!.dispatchEvent(new Event('submit'));

    await vi.waitFor(() =>
      expect(api.sendMessage).toHaveBeenCalledWith('c1', 'Gracias, la reservo'),
    );
    await vi.waitFor(() => expect(host.textContent).toContain('Gracias, la reservo'));
    expect((host.querySelector('#message-body') as HTMLTextAreaElement).value).toBe('');
    expect(host.querySelectorAll('app-message-bubble').length).toBe(3);
  });

  it('should block an empty message without calling the API', async () => {
    const { api } = setup();
    const fixture = TestBed.createComponent(ConversationPage);
    await fixture.whenStable();
    const host = fixture.nativeElement as HTMLElement;

    typeInto(host, '#message-body', '   ');
    host.querySelector('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();

    expect(host.textContent).toContain('Escribe un mensaje');
    expect(api.sendMessage).not.toHaveBeenCalled();
  });

  it('should explain the real 403 when the conversation is blocked', async () => {
    const { api } = setup();
    api.sendMessage.mockRejectedValue(
      new HttpErrorResponse({
        status: 403,
        error: { code: 'FORBIDDEN', message: 'The conversation is blocked between these users' },
      }),
    );
    const fixture = TestBed.createComponent(ConversationPage);
    await fixture.whenStable();
    const host = fixture.nativeElement as HTMLElement;

    typeInto(host, '#message-body', '¿Seguimos?');
    host.querySelector('form')!.dispatchEvent(new Event('submit'));

    await vi.waitFor(() => expect(host.textContent).toContain('hay un bloqueo entre vosotros'));
  });

  it('should require a reason to report and register the case', async () => {
    const { api } = setup();
    const fixture = TestBed.createComponent(ConversationPage);
    await fixture.whenStable();
    const host = fixture.nativeElement as HTMLElement;

    Array.from(host.querySelectorAll('button'))
      .find((button) => button.textContent?.includes('Reportar conversación'))!
      .click();
    await fixture.whenStable();

    host.querySelector('#report-reason')!.closest('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
    expect(api.reportConversation).not.toHaveBeenCalled();
    expect(host.textContent).toContain('Indica el motivo');

    typeInto(host, '#report-reason', '  Spam  ');
    host.querySelector('#report-reason')!.closest('form')!.dispatchEvent(new Event('submit'));

    await vi.waitFor(() => expect(api.reportConversation).toHaveBeenCalledWith('c1', 'Spam'));
    await vi.waitFor(() => expect(host.textContent).toContain('caso case1'));
  });

  it('should reflect a 409 when the conversation was already reported', async () => {
    const { api } = setup();
    api.reportConversation.mockRejectedValue(
      new HttpErrorResponse({
        status: 409,
        error: { code: 'CONFLICT', message: 'This conversation was already reported' },
      }),
    );
    const fixture = TestBed.createComponent(ConversationPage);
    await fixture.whenStable();
    const host = fixture.nativeElement as HTMLElement;

    Array.from(host.querySelectorAll('button'))
      .find((button) => button.textContent?.includes('Reportar conversación'))!
      .click();
    await fixture.whenStable();
    typeInto(host, '#report-reason', 'Spam');
    host.querySelector('#report-reason')!.closest('form')!.dispatchEvent(new Event('submit'));

    await vi.waitFor(() => expect(host.textContent).toContain('Ya reportaste esta conversación'));
  });

  it('should show an existing report and hide the report action', async () => {
    setup({ reports: [{ id: 'rep1', conversationId: 'c1', caseId: 'case7' }] });
    const fixture = TestBed.createComponent(ConversationPage);
    await fixture.whenStable();
    const host = fixture.nativeElement as HTMLElement;

    expect(host.textContent).toContain('Caso case7');
    expect(
      Array.from(host.querySelectorAll('button')).some((button) =>
        button.textContent?.includes('Reportar conversación'),
      ),
    ).toBe(false);
  });

  it('should block and unblock the counterpart', async () => {
    const { api } = setup();
    const fixture = TestBed.createComponent(ConversationPage);
    await fixture.whenStable();
    const host = fixture.nativeElement as HTMLElement;

    Array.from(host.querySelectorAll('button'))
      .find((button) => button.textContent?.includes('Bloquear a la contraparte'))!
      .click();

    await vi.waitFor(() => expect(api.blockUser).toHaveBeenCalledWith('host'));
    await vi.waitFor(() => expect(host.textContent).toContain('Usuario bloqueado'));
  });

  it('should name the backend 500 when blocking is not operable', async () => {
    const { api } = setup();
    api.blockUser.mockRejectedValue(
      new HttpErrorResponse({
        status: 500,
        error: { status: 500, error: 'Internal Server Error' },
      }),
    );
    const fixture = TestBed.createComponent(ConversationPage);
    await fixture.whenStable();
    const host = fixture.nativeElement as HTMLElement;

    Array.from(host.querySelectorAll('button'))
      .find((button) => button.textContent?.includes('Bloquear a la contraparte'))!
      .click();

    await vi.waitFor(() => expect(host.textContent).toContain('no pudo crear el bloqueo (500)'));
  });
});
