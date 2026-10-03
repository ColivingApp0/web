import { registerLocaleData } from '@angular/common';
import localeEsCo from '@angular/common/locales/es-CO';
import { LOCALE_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MessagingApi } from '../data-access/messaging-api';
import { NotificationView } from '../models/messaging-models';
import { NotificationsPage } from './notifications-page';

registerLocaleData(localeEsCo);

function notification(id: string, unread: boolean): NotificationView {
  return {
    id,
    type: 'MENSAJE_NUEVO',
    title: 'Tienes un nuevo mensaje',
    referenceId: 'c1',
    createdAt: '2026-10-05T10:01:00Z',
    readAt: unread ? null : '2026-10-05T11:00:00Z',
    unread,
  };
}

function setup(notifications: NotificationView[], unreadCount: number) {
  const api = {
    notificationsInbox: vi.fn().mockResolvedValue({
      unreadCount,
      notifications,
    }),
    markNotificationRead: vi.fn().mockResolvedValue(notification('n1', false)),
  };
  TestBed.configureTestingModule({
    imports: [NotificationsPage],
    providers: [
      provideRouter([]),
      { provide: LOCALE_ID, useValue: 'es-CO' },
      { provide: MessagingApi, useValue: api },
    ],
  });
  return { api };
}

describe('NotificationsPage', () => {
  it('should show the real unread counter and the notifications', async () => {
    setup([notification('n1', true), notification('n2', false)], 1);
    const fixture = TestBed.createComponent(NotificationsPage);
    await fixture.whenStable();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(text).toContain('1 notificación sin leer');
    expect(text).toContain('Tienes un nuevo mensaje');
    expect(text).toContain('Mensaje nuevo');
    expect(text).toContain('Sin leer');
    expect(text).toContain('Leída');
  });

  it('should link each notification to its conversation', async () => {
    setup([notification('n1', true)], 1);
    const fixture = TestBed.createComponent(NotificationsPage);
    await fixture.whenStable();
    const host = fixture.nativeElement as HTMLElement;

    expect(host.querySelector<HTMLAnchorElement>('a[href="/mensajes/c1"]') !== null).toBe(true);
  });

  it('should mark a notification as read and reload the inbox', async () => {
    const { api } = setup([notification('n1', true)], 1);
    const fixture = TestBed.createComponent(NotificationsPage);
    await fixture.whenStable();
    const host = fixture.nativeElement as HTMLElement;

    Array.from(host.querySelectorAll('button'))
      .find((button) => button.textContent?.includes('Marcar como leída'))!
      .click();

    await vi.waitFor(() => expect(api.markNotificationRead).toHaveBeenCalledWith('n1'));
    await vi.waitFor(() => expect(host.textContent).toContain('marcada como leída'));
    expect(api.notificationsInbox).toHaveBeenCalledTimes(2);
  });

  it('should show the empty state', async () => {
    setup([], 0);
    const fixture = TestBed.createComponent(NotificationsPage);
    await fixture.whenStable();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Sin notificaciones nuevas');
    expect(text).toContain('No tienes notificaciones.');
  });
});
