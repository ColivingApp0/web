import {
  ConversationView,
  MessageView,
  counterpartUserId,
  isOwnMessage,
  isParticipant,
  lastActivityAt,
  messageBodyError,
  orderedMessages,
  reportReasonError,
  unreadLabel,
} from './messaging-models';

const conversation: ConversationView = {
  id: 'c1',
  reservationId: 'r1',
  guestUserId: 'guest',
  hostUserId: 'host',
  createdAt: '2026-10-05T10:00:00Z',
  lastMessageAt: null,
  messageCount: 0,
};

function message(id: string, senderUserId: string, sentAt: string): MessageView {
  return { id, conversationId: 'c1', senderUserId, body: `cuerpo ${id}`, sentAt };
}

describe('participación en el hilo', () => {
  it('should accept both parties and reject anyone else', () => {
    expect(isParticipant(conversation, 'guest')).toBe(true);
    expect(isParticipant(conversation, 'host')).toBe(true);
    expect(isParticipant(conversation, 'intruso')).toBe(false);
  });

  it('should resolve the counterpart from either side', () => {
    expect(counterpartUserId(conversation, 'guest')).toBe('host');
    expect(counterpartUserId(conversation, 'host')).toBe('guest');
    expect(counterpartUserId(conversation, 'intruso')).toBeNull();
  });

  it('should identify own messages', () => {
    expect(isOwnMessage(message('m1', 'guest', '2026-10-05T10:00:00Z'), 'guest')).toBe(true);
    expect(isOwnMessage(message('m1', 'guest', '2026-10-05T10:00:00Z'), 'host')).toBe(false);
  });
});

describe('orderedMessages', () => {
  it('should order chronologically', () => {
    const ordered = orderedMessages([
      message('m3', 'host', '2026-10-05T12:00:00Z'),
      message('m1', 'guest', '2026-10-05T10:00:00Z'),
      message('m2', 'host', '2026-10-05T11:00:00Z'),
    ]);

    expect(ordered.map((item) => item.id)).toEqual(['m1', 'm2', 'm3']);
  });

  it('should break ties by id so the order is stable', () => {
    const ordered = orderedMessages([
      message('b', 'host', '2026-10-05T10:00:00Z'),
      message('a', 'guest', '2026-10-05T10:00:00Z'),
    ]);

    expect(ordered.map((item) => item.id)).toEqual(['a', 'b']);
  });

  it('should drop duplicates when a sent message is merged with a reload', () => {
    const sent = message('m1', 'guest', '2026-10-05T10:00:00Z');
    const ordered = orderedMessages([sent, sent, message('m2', 'host', '2026-10-05T11:00:00Z')]);

    expect(ordered.map((item) => item.id)).toEqual(['m1', 'm2']);
  });
});

describe('lastActivityAt', () => {
  it('should fall back to creation when there are no messages', () => {
    expect(lastActivityAt(conversation)).toBe('2026-10-05T10:00:00Z');
    expect(lastActivityAt({ ...conversation, lastMessageAt: '2026-10-06T09:00:00Z' })).toBe(
      '2026-10-06T09:00:00Z',
    );
  });
});

describe('validación de contenido', () => {
  it('should reject empty or whitespace-only messages', () => {
    expect(messageBodyError('')).toContain('Escribe un mensaje');
    expect(messageBodyError('   ')).toContain('Escribe un mensaje');
  });

  it('should accept up to the real 2000-character limit', () => {
    expect(messageBodyError('a'.repeat(2000))).toBeNull();
    expect(messageBodyError('a'.repeat(2001))).toContain('2000 caracteres');
  });

  it('should require a bounded report reason', () => {
    expect(reportReasonError('')).toContain('motivo');
    expect(reportReasonError('  ')).toContain('motivo');
    expect(reportReasonError('Spam')).toBeNull();
    expect(reportReasonError('a'.repeat(1001))).toContain('1000 caracteres');
  });

  it('should describe the unread counter', () => {
    expect(unreadLabel(0)).toBe('Sin notificaciones nuevas');
    expect(unreadLabel(1)).toBe('1 notificación sin leer');
    expect(unreadLabel(4)).toBe('4 notificaciones sin leer');
  });
});
