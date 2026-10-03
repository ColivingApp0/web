import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { MessagingApi } from './messaging-api';

const CONVERSATION = {
  id: 'c1',
  reservationId: 'r1',
  guestUserId: 'guest',
  hostUserId: 'host',
  createdAt: '2026-10-05T10:00:00Z',
  lastMessageAt: null,
  messageCount: 0,
};

const MESSAGE = {
  id: 'm1',
  conversationId: 'c1',
  senderUserId: 'guest',
  body: 'Hola',
  sentAt: '2026-10-05T10:01:00Z',
};

function setup() {
  TestBed.configureTestingModule({
    providers: [provideHttpClient(), provideHttpClientTesting()],
  });
  return { api: TestBed.inject(MessagingApi), http: TestBed.inject(HttpTestingController) };
}

describe('MessagingApi (contratos reales)', () => {
  it('should list and open conversations', async () => {
    const { api, http } = setup();

    const list = api.listConversations();
    const listRequest = http.expectOne('/api/v1/conversations');
    expect(listRequest.request.method).toBe('GET');
    listRequest.flush([CONVERSATION]);
    await expect(list).resolves.toHaveLength(1);

    const open = api.openConversation('r1');
    const openRequest = http.expectOne('/api/v1/conversations');
    expect(openRequest.request.method).toBe('POST');
    expect(openRequest.request.body).toEqual({ reservationId: 'r1' });
    openRequest.flush({
      conversation: CONVERSATION,
      stay: { reservationId: 'r1', fromDate: '2026-11-01', toDate: '2026-11-04' },
      messages: [MESSAGE],
    });
    await expect(open).resolves.toMatchObject({ messages: [MESSAGE] });
  });

  it('should read a conversation and send messages inside it', async () => {
    const { api, http } = setup();

    const detail = api.conversation('c1');
    http.expectOne('/api/v1/conversations/c1').flush({
      conversation: CONVERSATION,
      stay: { reservationId: 'r1', fromDate: '2026-11-01', toDate: '2026-11-04' },
      messages: [],
    });
    await expect(detail).resolves.toMatchObject({ messages: [] });

    const send = api.sendMessage('c1', 'Hola');
    const sendRequest = http.expectOne('/api/v1/conversations/c1/messages');
    expect(sendRequest.request.method).toBe('POST');
    expect(sendRequest.request.body).toEqual({ body: 'Hola' });
    sendRequest.flush(MESSAGE);
    await expect(send).resolves.toMatchObject({ id: 'm1' });
  });

  it('should read the notification inbox and acknowledge one notification', async () => {
    const { api, http } = setup();

    const inbox = api.notificationsInbox();
    const inboxRequest = http.expectOne('/api/v1/notifications');
    expect(inboxRequest.request.method).toBe('GET');
    inboxRequest.flush({
      unreadCount: 1,
      notifications: [
        {
          id: 'n1',
          type: 'MENSAJE_NUEVO',
          title: 'Tienes un nuevo mensaje',
          referenceId: 'c1',
          createdAt: '2026-10-05T10:01:00Z',
          readAt: null,
          unread: true,
        },
      ],
    });
    await expect(inbox).resolves.toMatchObject({ unreadCount: 1 });

    const read = api.markNotificationRead('n1');
    const readRequest = http.expectOne('/api/v1/notifications/n1/read');
    expect(readRequest.request.method).toBe('POST');
    readRequest.flush({
      id: 'n1',
      type: 'MENSAJE_NUEVO',
      title: 'Tienes un nuevo mensaje',
      referenceId: 'c1',
      createdAt: '2026-10-05T10:01:00Z',
      readAt: '2026-10-05T11:00:00Z',
      unread: false,
    });
    await expect(read).resolves.toMatchObject({ unread: false });
  });

  it('should use the safety endpoints (report, blocks)', async () => {
    const { api, http } = setup();

    const report = api.reportConversation('c1', 'Spam');
    const reportRequest = http.expectOne('/api/v1/conversations/c1/reports');
    expect(reportRequest.request.method).toBe('POST');
    expect(reportRequest.request.body).toEqual({ reason: 'Spam' });
    reportRequest.flush({
      id: 'rep1',
      conversationId: 'c1',
      reportedUserId: 'host',
      reason: 'Spam',
      caseId: 'case1',
      createdAt: '2026-10-05T12:00:00Z',
    });
    await expect(report).resolves.toMatchObject({ caseId: 'case1' });

    const reports = api.listMyReports();
    http.expectOne('/api/v1/conversations/reports').flush([]);
    await expect(reports).resolves.toEqual([]);

    const block = api.blockUser('host');
    const blockRequest = http.expectOne('/api/v1/users/me/blocks');
    expect(blockRequest.request.method).toBe('POST');
    expect(blockRequest.request.body).toEqual({ blockedUserId: 'host' });
    blockRequest.flush({ blockedUserId: 'host', createdAt: '2026-10-05T12:05:00Z' });
    await expect(block).resolves.toMatchObject({ blockedUserId: 'host' });

    const blocks = api.listMyBlocks();
    http.expectOne('/api/v1/users/me/blocks').flush([{ blockedUserId: 'host', createdAt: '' }]);
    await expect(blocks).resolves.toHaveLength(1);

    const unblock = api.unblockUser('host');
    const unblockRequest = http.expectOne('/api/v1/users/me/blocks/host');
    expect(unblockRequest.request.method).toBe('DELETE');
    unblockRequest.flush(null);
    await expect(unblock).resolves.toBeNull();
  });
});
