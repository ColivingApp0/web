import { Component, computed, inject, resource, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { toApiError } from '../../../core/http/api-error';
import { UiAlert } from '../../../shared/ui/alert';
import { UiButton } from '../../../shared/ui/button';
import { UiEmptyState } from '../../../shared/ui/empty-state';
import { UiIcon } from '../../../shared/ui/icon';
import { UiPageHeader } from '../../../shared/ui/page-header';
import { BookingsApi } from '../../bookings/data-access/bookings-api';
import { ReservationView } from '../../bookings/models/bookings-models';
import { pluralize } from '../../../shared/utils/plural';
import { HostApi } from '../data-access/host-api';
import { HostProperty, HostPropertyDetail } from '../models/host-models';
import { HostPropertyForm } from '../ui/property-form';

interface Dashboard {
  properties: HostProperty[];
  details: HostPropertyDetail[];
  incoming: ReservationView[];
}

interface PropertyCard {
  property: HostProperty;
  rooms: number;
  freePlaces: number;
  paused: number;
  published: number;
  pending: number;
}

/** Panel del anfitrión: resumen real de propiedades, habitaciones y solicitudes. */
@Component({
  selector: 'app-host-dashboard-page',
  imports: [RouterLink, UiAlert, UiButton, UiEmptyState, UiIcon, UiPageHeader, HostPropertyForm],
  templateUrl: './host-dashboard-page.html',
})
export class HostDashboardPage {
  private readonly api = inject(HostApi);
  private readonly bookings = inject(BookingsApi);

  protected readonly showCreate = signal(false);
  protected readonly success = signal<string | null>(null);

  protected readonly dashboardResource = resource<Dashboard, void>({
    loader: async () => {
      const properties = await this.api.listProperties();
      const [details, incoming] = await Promise.all([
        Promise.all(properties.map((property) => this.api.propertyDetail(property.id))),
        this.bookings.listIncoming(),
      ]);
      return { properties, details, incoming };
    },
  });

  protected readonly loading = computed(() => this.dashboardResource.isLoading());
  protected readonly loadError = computed(() => {
    const error = this.dashboardResource.error();
    return error ? toApiError(error).message : null;
  });

  protected readonly cards = computed<PropertyCard[]>(() => {
    const data = this.dashboardResource.value();
    if (!data) return [];
    return data.properties.map((property) => {
      const detail = data.details.find((entry) => entry.property.id === property.id);
      const rooms = detail?.rooms ?? [];
      const roomIds = new Set(rooms.map((room) => room.id));
      return {
        property,
        rooms: rooms.length,
        freePlaces: rooms
          .filter((room) => room.published)
          .reduce((sum, room) => sum + room.availablePlaces, 0),
        paused: rooms.filter((room) => !room.published).length,
        published: rooms.filter((room) => room.published).length,
        pending: data.incoming.filter(
          (request) => roomIds.has(request.unitId) && request.status === 'SOLICITADA',
        ).length,
      };
    });
  });

  protected readonly stats = computed(() => {
    const cards = this.cards();
    return {
      properties: cards.length,
      rooms: cards.reduce((sum, card) => sum + card.rooms, 0),
      free: cards.reduce((sum, card) => sum + card.freePlaces, 0),
      pending: cards.reduce((sum, card) => sum + card.pending, 0),
    };
  });

  protected publishedLabel(count: number): string {
    return pluralize(count, 'publicada', 'publicadas');
  }

  protected pausedLabel(count: number): string {
    return pluralize(count, 'pausada', 'pausadas');
  }

  protected load(): void {
    this.dashboardResource.reload();
  }

  protected onCreated(property: HostProperty): void {
    this.showCreate.set(false);
    this.success.set('Propiedad creada. Ahora añade sus habitaciones, fotos y precios mensuales.');
    this.dashboardResource.reload();
  }

  protected cover(card: PropertyCard): string | null {
    return card.property.photos[0]?.url ?? null;
  }

  protected location(card: PropertyCard): string {
    return [card.property.neighborhood, card.property.cityName].filter(Boolean).join(', ');
  }
}
