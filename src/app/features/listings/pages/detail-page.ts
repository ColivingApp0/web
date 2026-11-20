import { CurrencyPipe } from '@angular/common';
import { Component, computed, inject, resource, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthSession } from '../../../core/auth/auth-session';
import { toApiError } from '../../../core/http/api-error';
import { UiAlert } from '../../../shared/ui/alert';
import { UiAvailabilityBadge } from '../ui/availability-badge';
import { UiAvatar } from '../../../shared/ui/avatar';
import { UiButton } from '../../../shared/ui/button';
import { UiEmptyState } from '../../../shared/ui/empty-state';
import { UiIcon } from '../../../shared/ui/icon';
import { MessagingApi } from '../../messaging/data-access/messaging-api';
import { canonicalCityName } from '../../directory/models/directory-models';
import { ListingsApi } from '../data-access/listings-api';
import { bathroomLabel, priceUnitLabel, roomTypeLabel } from '../models/listings-models';
import { freePlacesLabel, occupiedPlacesLabel, placesLabel } from '../../../shared/utils/plural';
import { amenityIcon } from '../../../shared/utils/amenity-icon';
import { FavoritesStore } from '../state/favorites-store';

/**
 * Detalle de una habitación publicada: fotos propias, características,
 * capacidad, ocupación, plazas libres, precio mensual, anfitrión, compañeros
 * autorizados y acciones de contacto/solicitud.
 */
@Component({
  selector: 'app-detail-page',
  imports: [
    CurrencyPipe,
    RouterLink,
    UiAlert,
    UiAvailabilityBadge,
    UiAvatar,
    UiButton,
    UiEmptyState,
    UiIcon,
  ],
  templateUrl: './detail-page.html',
})
export class DetailPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(ListingsApi);
  private readonly messaging = inject(MessagingApi);
  protected readonly favorites = inject(FavoritesStore);
  protected readonly session = inject(AuthSession);

  constructor() {
    void this.favorites.load();
  }

  private readonly params = toSignal(this.route.paramMap, { requireSync: true });
  protected readonly publicationId = computed(() => this.params().get('id') ?? '');

  protected readonly detailResource = resource({
    params: () => this.publicationId(),
    loader: ({ params }) => this.api.detail(params),
  });

  protected readonly detail = computed(() =>
    this.detailResource.hasValue() ? this.detailResource.value() : null,
  );
  protected readonly loading = computed(() => {
    const status = this.detailResource.status();
    return status === 'loading' || status === 'reloading' || status === 'idle';
  });
  protected readonly notFound = computed(() => {
    const error = this.detailResource.error();
    if (!error) return false;
    const { status } = toApiError(error);
    return status === 404 || status === 400;
  });
  protected readonly errorMessage = computed(() => {
    const error = this.detailResource.error();
    if (!error) return null;
    const apiError = toApiError(error);
    if (apiError.status === 404 || apiError.status === 400) {
      return 'Puede haberse pausado, archivado o no existir. Revisa el enlace o vuelve a la búsqueda.';
    }
    if (apiError.status === 0) {
      return 'No pudimos conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.';
    }
    return 'No pudimos cargar esta habitación en este momento. Vuelve a intentarlo en unos segundos.';
  });

  protected readonly roommatesResource = resource({
    params: () => {
      if (!this.detailResource.hasValue()) return null;
      const detail = this.detailResource.value();
      return detail.unit.roomType === 'COMPARTIDA' ? detail.publication.id : null;
    },
    loader: ({ params }) => (params === null ? Promise.resolve([]) : this.api.roommates(params)),
  });

  protected readonly roommates = computed(() => this.roommatesResource.value() ?? []);
  protected readonly roommatesError = computed(() => {
    const error = this.roommatesResource.error();
    return error ? toApiError(error).message : null;
  });

  protected readonly photos = computed(() => this.detail()?.unit.photos ?? []);
  protected readonly photoIndex = signal(0);
  protected readonly activePhoto = computed(() => {
    const photos = this.photos();
    return photos[this.photoIndex()] ?? photos[0] ?? this.detail()?.propertyPhotos[0] ?? null;
  });

  protected readonly location = computed(() => {
    const detail = this.detail();
    if (!detail) return '';
    return [detail.property.neighborhood, canonicalCityName(detail.property.cityName ?? '')]
      .filter(Boolean)
      .join(', ');
  });
  protected readonly hasGuestRole = computed(() =>
    (this.session.user()?.roles ?? []).some(
      (role) => role.active && role.code.startsWith('HUESPED'),
    ),
  );
  protected readonly canRequest = computed(() => {
    const detail = this.detail();
    return detail !== null && detail.occupancy.effectiveAvailable && this.hasGuestRole();
  });

  protected readonly places = placesLabel;
  protected readonly occupiedPlaces = occupiedPlacesLabel;
  protected readonly freePlaces = freePlacesLabel;
  protected readonly amenityIcon = amenityIcon;

  protected readonly contactBusy = signal(false);
  protected readonly contactError = signal<string | null>(null);

  protected selectPhoto(index: number): void {
    this.photoIndex.set(index);
  }

  protected priceUnit(unit: 'POR_HABITACION' | 'POR_PERSONA'): string {
    return priceUnitLabel(unit);
  }

  protected roomType(unit: 'INDIVIDUAL' | 'COMPARTIDA'): string {
    return roomTypeLabel(unit);
  }

  protected bathroom(unit: 'PRIVADO' | 'COMPARTIDO'): string {
    return bathroomLabel(unit);
  }

  protected retry(): void {
    this.detailResource.reload();
    this.roommatesResource.reload();
  }

  /** Abre (o reutiliza) el hilo directo sobre esta habitación y navega a él. */
  protected async contactHost(): Promise<void> {
    const detail = this.detail();
    if (!detail || this.contactBusy()) return;
    this.contactBusy.set(true);
    this.contactError.set(null);
    try {
      const conversation = await this.messaging.openConversationForUnit(detail.unit.id);
      await this.router.navigate(['/mensajes', conversation.conversation.id]);
    } catch (error) {
      const apiError = toApiError(error);
      this.contactError.set(
        apiError.status === 403
          ? 'No puedes abrir una conversación con tu propio anuncio.'
          : apiError.message,
      );
    } finally {
      this.contactBusy.set(false);
    }
  }
}
