import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, computed, input, output, signal } from '@angular/core';
import { UiButton } from '../../../shared/ui/button';
import { UiFormField } from '../../../shared/ui/form-field';
import {
  CANCELLATION_POLICY_LABELS,
  GuestReservationAction,
  HostReservationAction,
  RESERVATION_EVENT_LABELS,
  RESERVATION_STATUS_CLASSES,
  RESERVATION_STATUS_LABELS,
  ReservationActionOption,
  ReservationEventView,
  ReservationView,
  guestReservationActions,
  hostReservationActions,
  isHoldExpired,
  stayNights,
} from '../models/bookings-models';

export interface ReservationActionEvent {
  action: GuestReservationAction | HostReservationAction;
  reason: string | null;
}

/** Acciones que exigen confirmar con un motivo escrito en la tarjeta. */
const REASON_PROMPTS: Partial<
  Record<
    GuestReservationAction | HostReservationAction,
    {
      label: string;
      hint: string;
      required: boolean;
      placeholder: string;
    }
  >
> = {
  reject: {
    label: 'Motivo del rechazo (opcional)',
    hint: 'Se registra en el historial de la reserva.',
    required: false,
    placeholder: 'Fechas no disponibles, requisitos no cumplidos…',
  },
  'request-info': {
    label: '¿Qué información necesitas? (opcional)',
    hint: 'El huésped verá este mensaje en el historial.',
    required: false,
    placeholder: 'Número de acompañantes, motivo de la estancia…',
  },
  cancel: {
    label: 'Motivo de la cancelación (obligatorio)',
    hint: 'El backend exige un motivo para cancelar; quedará en el historial.',
    required: true,
    placeholder: 'Cambio de planes, error en las fechas…',
  },
};

/**
 * Tarjeta de una reserva (misma pieza para huésped y anfitrión: dos consumidores
 * reales). Muestra el estado real, las condiciones congeladas (RN-07), el hold
 * cuando aplica y las acciones que el contrato permite para ese estado.
 * No llama a la API: emite la intención y la página decide.
 */
@Component({
  selector: 'app-reservation-card',
  imports: [CurrencyPipe, DatePipe, UiButton, UiFormField],
  templateUrl: './reservation-card.html',
})
export class ReservationCard {
  readonly reservation = input.required<ReservationView>();
  readonly mode = input.required<'guest' | 'host'>();
  readonly unitName = input<string | null>(null);
  readonly history = input<readonly ReservationEventView[] | null>(null);
  readonly historyLoading = input(false);
  readonly busyAction = input<string | null>(null);

  readonly action = output<ReservationActionEvent>();
  readonly toggleHistory = output<void>();

  protected readonly statusLabels = RESERVATION_STATUS_LABELS;
  protected readonly statusClasses = RESERVATION_STATUS_CLASSES;
  protected readonly eventLabels = RESERVATION_EVENT_LABELS;
  protected readonly policyLabels = CANCELLATION_POLICY_LABELS;

  protected readonly pendingReason = signal<GuestReservationAction | HostReservationAction | null>(
    null,
  );
  protected readonly reason = signal('');

  protected readonly nights = computed(() =>
    stayNights(this.reservation().fromDate, this.reservation().toDate),
  );

  protected readonly actions = computed<
    readonly ReservationActionOption<GuestReservationAction | HostReservationAction>[]
  >(() => {
    const status = this.reservation().status;
    return (
      this.mode() === 'guest' ? guestReservationActions(status) : hostReservationActions(status)
    ) as readonly ReservationActionOption<GuestReservationAction | HostReservationAction>[];
  });

  protected readonly holdExpired = computed(() =>
    this.reservation().status === 'ACEPTADA'
      ? isHoldExpired(this.reservation().holdExpiresAt, new Date())
      : false,
  );

  protected readonly reasonPrompt = computed(() => {
    const action = this.pendingReason();
    return action === null ? null : (REASON_PROMPTS[action] ?? null);
  });

  protected readonly reasonMissing = computed(
    () => this.reasonPrompt()?.required === true && this.reason().trim().length === 0,
  );

  protected menuLabel(action: GuestReservationAction | HostReservationAction): string {
    return this.actions().find((option) => option.action === action)?.label ?? action;
  }

  protected run(
    option: ReservationActionOption<GuestReservationAction | HostReservationAction>,
  ): void {
    if (REASON_PROMPTS[option.action]) {
      this.reason.set('');
      this.pendingReason.set(option.action);
      return;
    }
    this.action.emit({ action: option.action, reason: null });
  }

  protected confirmReason(): void {
    const action = this.pendingReason();
    if (action === null || this.reasonMissing()) {
      return;
    }
    const reason = this.reason().trim();
    this.pendingReason.set(null);
    this.reason.set('');
    this.action.emit({ action, reason: reason.length === 0 ? null : reason });
  }

  protected dismissReason(): void {
    this.pendingReason.set(null);
    this.reason.set('');
  }

  protected updateReason(event: Event): void {
    const target = event.target;
    this.reason.set(target instanceof HTMLTextAreaElement ? target.value : '');
  }

  protected requestHistory(): void {
    this.toggleHistory.emit();
  }
}
