import { DatePipe } from '@angular/common';
import { Component, computed, input } from '@angular/core';
import { MessageView } from '../models/messaging-models';

/**
 * Burbuja de un mensaje del hilo. Separa enviados y recibidos con **etiqueta
 * textual** (`Tú` / `Contraparte`) además del color, para no depender solo del
 * color (accesibilidad) y para dejar claro el remitente real que informa el
 * backend. Es una pieza de la feature (un solo consumidor hoy: el hilo).
 */
@Component({
  selector: 'app-message-bubble',
  imports: [DatePipe],
  template: `
    <li [class]="classes()">
      <p class="text-xs font-semibold" [class]="metaClasses()">
        {{ own() ? 'Tú' : 'Contraparte' }} ·
        {{ message().sentAt | date: 'd MMM y, HH:mm' }}
      </p>
      <p class="mt-1 whitespace-pre-wrap break-words text-sm text-ink">{{ message().body }}</p>
    </li>
  `,
})
export class MessageBubble {
  readonly message = input.required<MessageView>();
  readonly own = input.required<boolean>();

  protected readonly classes = computed(
    () =>
      `max-w-[85%] rounded-xl border px-4 py-2.5 ${
        this.own() ? 'border-brand-700/30 bg-brand-700/10 sm:ml-auto' : 'border-line bg-white'
      }`,
  );

  protected readonly metaClasses = computed(() => (this.own() ? 'text-brand-800' : 'text-muted'));
}
