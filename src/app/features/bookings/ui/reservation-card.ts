import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { UiIcon } from '../../../shared/ui/icon';
import { placesLabel } from '../../../shared/utils/plural';
import {
  RESERVATION_STATUS_CLASSES,
  RESERVATION_STATUS_LABELS,
  ReservationView,
  priceUnitLabel,
} from '../models/bookings-models';

/** Tarjeta de solicitud mensual compartida por huésped y anfitrión. */
@Component({
  selector: 'app-reservation-card',
  imports: [CurrencyPipe, DatePipe, RouterLink, UiIcon],
  templateUrl: './reservation-card.html',
})
export class ReservationCard {
  readonly reservation = input.required<ReservationView>();

  protected readonly places = placesLabel;
  protected readonly statusLabel = computed(
    () => RESERVATION_STATUS_LABELS[this.reservation().status],
  );
  protected readonly statusClasses = computed(
    () => RESERVATION_STATUS_CLASSES[this.reservation().status],
  );
  protected readonly priceUnit = computed(() => priceUnitLabel(this.reservation().priceUnit));
}
