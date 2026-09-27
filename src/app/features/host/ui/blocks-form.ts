import { DatePipe } from '@angular/common';
import { Component, computed, inject, input, signal } from '@angular/core';
import { FormField as SignalFormField, FormRoot, form, required } from '@angular/forms/signals';
import { toApiError } from '../../../core/http/api-error';
import { UiAlert } from '../../../shared/ui/alert';
import { UiButton } from '../../../shared/ui/button';
import { firstFieldError } from '../../../shared/ui/field-errors';
import { UiFormField } from '../../../shared/ui/form-field';
import { HostApi } from '../data-access/host-api';
import { HostAvailabilityState, HostDayAvailability } from '../models/host-models';

interface BlocksModel {
  from: string;
  to: string;
}

const STATE_META: Record<HostAvailabilityState, { label: string; classes: string }> = {
  DISPONIBLE: { label: 'Disponible', classes: 'bg-brand-700/10 text-brand-800' },
  BLOQUEADO: { label: 'No disponible', classes: 'bg-accent-500/15 text-accent-600' },
  OCUPADO: { label: 'Ocupado', classes: 'bg-red-100 text-red-800' },
};

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

/**
 * Bloqueo y liberación de fechas de una unidad (RF disponibilidad del anfitrión).
 * Intervalo `[from, to)`, máx. 366 noches (regla real del backend); el backend
 * solo libera bloqueos del anfitrión (nunca retenciones de reservas).
 */
@Component({
  selector: 'app-host-blocks-form',
  imports: [DatePipe, UiAlert, UiButton, UiFormField, SignalFormField, FormRoot],
  templateUrl: './blocks-form.html',
})
export class HostBlocksForm {
  readonly unitId = input.required<string>();

  private readonly api = inject(HostApi);
  private readonly today = new Date();

  protected readonly days = signal<readonly HostDayAvailability[] | null>(null);
  protected readonly busy = signal<'block' | 'release' | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly resultMessage = signal<string | null>(null);

  private readonly model = signal<BlocksModel>({
    from: isoDate(this.today),
    to: isoDate(addDays(this.today, 7)),
  });

  protected readonly blocksForm = form(
    this.model,
    (path) => {
      required(path.from, { message: 'Indica la fecha «desde».' });
      required(path.to, { message: 'Indica la fecha «hasta».' });
    },
    {
      submission: {
        action: async () => {
          await this.run('block');
          return undefined;
        },
      },
    },
  );

  protected readonly fromError = computed(() => firstFieldError(this.blocksForm.from));
  protected readonly toError = computed(() => firstFieldError(this.blocksForm.to));

  protected stateLabel(state: HostAvailabilityState): string {
    return STATE_META[state].label;
  }

  protected stateClasses(state: HostAvailabilityState): string {
    return STATE_META[state].classes;
  }

  protected async run(operation: 'block' | 'release'): Promise<void> {
    const { from, to } = this.model();
    const validation = this.validateRange(from, to);
    if (validation !== null) {
      this.error.set(validation);
      return;
    }
    this.busy.set(operation);
    this.error.set(null);
    this.resultMessage.set(null);
    try {
      const days =
        operation === 'block'
          ? await this.api.blockDates(this.unitId(), from, to)
          : await this.api.releaseDates(this.unitId(), from, to);
      this.days.set(days);
      this.resultMessage.set(
        operation === 'block'
          ? 'Fechas bloqueadas. La unidad no recibirá solicitudes en esos días.'
          : 'Se liberaron los bloqueos del anfitrión en ese rango.',
      );
    } catch (error) {
      this.error.set(toApiError(error).message);
    } finally {
      this.busy.set(null);
    }
  }

  private validateRange(from: string, to: string): string | null {
    if (from === '' || to === '') return 'Indica las fechas «desde» y «hasta».';
    if (to <= from) return 'La fecha «hasta» debe ser posterior a «desde».';
    const nights = (Date.parse(to) - Date.parse(from)) / 86_400_000;
    if (nights > 366) return 'El rango no puede superar 366 noches.';
    return null;
  }
}
