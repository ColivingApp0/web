import { HttpErrorResponse } from '@angular/common/http';
import { registerLocaleData } from '@angular/common';
import localeEsCo from '@angular/common/locales/es-CO';
import { LOCALE_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MessagingApi } from '../data-access/messaging-api';
import { ConversationView } from '../models/messaging-models';
import { ConversationsPage } from './conversations-page';

registerLocaleData(localeEsCo);

const conversation: ConversationView = {
  id: 'c1',
  reservationId: 'r1',
  guestUserId: 'guest',
  hostUserId: 'host',
  createdAt: '2026-10-05T10:00:00Z',
  lastMessageAt: '2026-10-06T09:00:00Z',
  messageCount: 3,
};

function setup(
  conversations: ConversationView[],
  blocks: { blockedUserId: string; createdAt: string }[],
) {
  const api = {
    listConversations: vi.fn().mockResolvedValue(conversations),
    listMyBlocks: vi.fn().mockResolvedValue(blocks),
    unblockUser: vi.fn().mockResolvedValue(undefined),
  };
  TestBed.configureTestingModule({
    imports: [ConversationsPage],
    providers: [
      provideRouter([]),
      { provide: LOCALE_ID, useValue: 'es-CO' },
      { provide: MessagingApi, useValue: api },
    ],
  });
  return { api };
}

describe('ConversationsPage', () => {
  it('should render threads with activity and volume', async () => {
    setup([conversation], []);
    const fixture = TestBed.createComponent(ConversationsPage);
    await fixture.whenStable();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(text).toContain('3 mensaje(s)');
    expect(text).toContain('última actividad');
    expect(text).toContain('6 oct 2026');
  });

  it('should render the empty state that explains how threads start', async () => {
    setup([], []);
    const fixture = TestBed.createComponent(ConversationsPage);
    await fixture.whenStable();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'Aún no tienes conversaciones.',
    );
  });

  it('should unblock a user and refresh the list', async () => {
    const { api } = setup([], [{ blockedUserId: 'host', createdAt: '2026-10-05T12:00:00Z' }]);
    const fixture = TestBed.createComponent(ConversationsPage);
    await fixture.whenStable();
    const host = fixture.nativeElement as HTMLElement;

    Array.from(host.querySelectorAll('button'))
      .find((button) => button.textContent?.includes('Desbloquear'))!
      .click();

    await vi.waitFor(() => expect(api.unblockUser).toHaveBeenCalledWith('host'));
    await vi.waitFor(() => expect(host.textContent).toContain('Usuario desbloqueado'));
    expect(api.listMyBlocks).toHaveBeenCalledTimes(2);
  });

  it('should keep the state when unblocking fails with 404', async () => {
    const { api } = setup([], [{ blockedUserId: 'host', createdAt: '2026-10-05T12:00:00Z' }]);
    api.unblockUser.mockRejectedValue(
      new HttpErrorResponse({ status: 404, error: { code: 'NOT_FOUND', message: 'not blocked' } }),
    );
    const fixture = TestBed.createComponent(ConversationsPage);
    await fixture.whenStable();
    const host = fixture.nativeElement as HTMLElement;

    Array.from(host.querySelectorAll('button'))
      .find((button) => button.textContent?.includes('Desbloquear'))!
      .click();

    await vi.waitFor(() => expect(host.textContent).toContain('ya no estaba bloqueado'));
  });
});
