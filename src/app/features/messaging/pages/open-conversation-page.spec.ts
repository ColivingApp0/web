import { registerLocaleData } from '@angular/common';
import localeEsCo from '@angular/common/locales/es-CO';
import { LOCALE_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { of } from 'rxjs';
import { MessagingApi } from '../data-access/messaging-api';
import { OpenConversationPage } from './open-conversation-page';

registerLocaleData(localeEsCo);

const conversation = {
  id: 'c14',
  reservationId: 'r1',
  guestUserId: 'guest',
  hostUserId: 'host',
  createdAt: '2026-10-05T10:00:00Z',
  lastMessageAt: null,
  messageCount: 0,
};

function setup(reservationId: string, conversations = [conversation]) {
  const api = {
    listConversations: vi.fn().mockResolvedValue(conversations),
    sendMessageToReservation: vi.fn().mockResolvedValue({
      id: 'm1',
      conversationId: 'c14',
      senderUserId: 'guest',
      body: 'Hola',
      sentAt: '2026-10-05T10:00:00Z',
    }),
  };
  const router = { navigate: vi.fn().mockResolvedValue(true) };
  TestBed.configureTestingModule({
    imports: [OpenConversationPage],
    providers: [
      { provide: LOCALE_ID, useValue: 'es-CO' },
      { provide: Router, useValue: router },
      {
        provide: ActivatedRoute,
        useValue: {
          queryParamMap: of(
            convertToParamMap(reservationId === '' ? {} : { reserva: reservationId }),
          ),
        },
      },
      { provide: MessagingApi, useValue: api },
    ],
  });
  return { api, router };
}

describe('OpenConversationPage', () => {
  it('should go straight to the existing thread of the reservation', async () => {
    const { api, router } = setup('r1');
    const fixture = TestBed.createComponent(OpenConversationPage);
    await fixture.whenStable();

    await vi.waitFor(() => expect(router.navigate).toHaveBeenCalledWith(['/mensajes', 'c14']));
    expect(api.sendMessageToReservation).not.toHaveBeenCalled();
  });

  it('should ask for the first message when the thread does not exist yet', async () => {
    const { api, router } = setup('r2', [conversation]);
    const fixture = TestBed.createComponent(OpenConversationPage);
    await fixture.whenStable();
    const host = fixture.nativeElement as HTMLElement;

    await vi.waitFor(() => expect(host.textContent).toContain('Primer mensaje'));
    expect(router.navigate).not.toHaveBeenCalled();
    expect(api.sendMessageToReservation).not.toHaveBeenCalled();
  });

  it('should block an empty first message locally', async () => {
    const { api } = setup('r2', []);
    const fixture = TestBed.createComponent(OpenConversationPage);
    await fixture.whenStable();
    const host = fixture.nativeElement as HTMLElement;

    host.querySelector('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();

    expect(host.textContent).toContain('Escribe un mensaje');
    expect(api.sendMessageToReservation).not.toHaveBeenCalled();
  });

  it('should create the thread with the first message and enter it', async () => {
    const { api, router } = setup('r2', []);
    const fixture = TestBed.createComponent(OpenConversationPage);
    await fixture.whenStable();
    const host = fixture.nativeElement as HTMLElement;

    const body = host.querySelector<HTMLTextAreaElement>('#first-message-body')!;
    body.value = '  Hola anfitrión  ';
    body.dispatchEvent(new Event('input'));
    host.querySelector('form')!.dispatchEvent(new Event('submit'));

    await vi.waitFor(() =>
      expect(api.sendMessageToReservation).toHaveBeenCalledWith('r2', 'Hola anfitrión'),
    );
    await vi.waitFor(() => expect(router.navigate).toHaveBeenCalledWith(['/mensajes', 'c14']));
  });

  it('should explain a missing reservation parameter', async () => {
    setup('');
    const fixture = TestBed.createComponent(OpenConversationPage);
    await fixture.whenStable();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Falta la reserva');
  });
});
