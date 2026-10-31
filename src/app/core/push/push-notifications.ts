import { isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID, Service, inject, signal } from '@angular/core';
import type { MessagePayload, Messaging } from 'firebase/messaging';
import { environment } from '../../../environments/environment';
import { isFirebaseConfigured } from './firebase-config';
import { PushApi } from './push-api';

/**
 * Web Push through Firebase Cloud Messaging (RF-051 external channel).
 *
 * - Initialization is lazy and browser-only (safe for SSR): the Firebase SDK is
 *   imported dynamically and nothing runs on the server.
 * - Permission is **never** requested automatically; `enable()` is wired to an
 *   explicit user action, as browsers require.
 * - Foreground messages are shown with the Notification API; background
 *   messages are handled by `public/firebase-messaging-sw.js`.
 */
@Service()
export class PushNotifications {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly pushApi = inject(PushApi);

  private readonly supportedState = signal(false);
  private readonly enabledState = signal(false);
  private readonly busyState = signal(false);
  private readonly errorState = signal<string | null>(null);

  readonly supported = this.supportedState.asReadonly();
  readonly enabled = this.enabledState.asReadonly();
  readonly busy = this.busyState.asReadonly();
  readonly error = this.errorState.asReadonly();

  private messaging: Messaging | null = null;
  private registration: ServiceWorkerRegistration | null = null;
  private token: string | null = null;
  private initialized = false;

  /** Called once from the app initializer. Never throws. */
  async initialize(): Promise<void> {
    if (this.initialized || !isPlatformBrowser(this.platformId)) {
      return;
    }
    if (!isFirebaseConfigured(environment.firebase)) {
      return;
    }
    if (typeof Notification === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    this.initialized = true;
    try {
      const { initializeApp, getApps } = await import('firebase/app');
      const { getMessaging, onMessage } = await import('firebase/messaging');
      const { vapidKey: _vapidKey, ...options } = environment.firebase;
      const app = getApps().length > 0 ? getApps()[0] : initializeApp(options);
      this.messaging = getMessaging(app);
      this.registration = await this.ensureServiceWorker();
      onMessage(this.messaging, (payload) => this.showForegroundNotification(payload));
      this.supportedState.set(true);

      // Re-register silently when the user already granted permission.
      if (Notification.permission === 'granted') {
        await this.registerToken();
      }
    } catch (error) {
      this.initialized = false;
      this.errorState.set(this.describe(error));
    }
  }

  /** Asks for permission and registers the device. Must run from a click. */
  async enable(): Promise<void> {
    if (!this.supportedState()) {
      await this.initialize();
    }
    if (!this.supportedState()) {
      this.errorState.set('Las notificaciones push no están configuradas en esta instalación.');
      return;
    }

    this.busyState.set(true);
    this.errorState.set(null);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        this.errorState.set('No diste permiso para mostrar notificaciones.');
        return;
      }
      await this.registerToken();
    } catch (error) {
      this.errorState.set(this.describe(error));
    } finally {
      this.busyState.set(false);
    }
  }

  /** Removes the device from FCM and from the backend. */
  async disable(): Promise<void> {
    this.busyState.set(true);
    this.errorState.set(null);
    try {
      if (this.messaging) {
        const { deleteToken } = await import('firebase/messaging');
        await deleteToken(this.messaging).catch(() => undefined);
      }
      if (this.token) {
        await this.pushApi.unregister(this.token).catch(() => undefined);
      }
      this.token = null;
      this.enabledState.set(false);
    } catch (error) {
      this.errorState.set(this.describe(error));
    } finally {
      this.busyState.set(false);
    }
  }

  private async registerToken(): Promise<void> {
    if (!this.messaging) {
      throw new Error('Firebase Messaging no está inicializado.');
    }
    const { getToken } = await import('firebase/messaging');
    this.registration ??= await this.ensureServiceWorker();
    const token = await getToken(this.messaging, {
      vapidKey: environment.firebase.vapidKey,
      serviceWorkerRegistration: this.registration,
    });
    if (!token) {
      throw new Error('Firebase no devolvió un token para este dispositivo.');
    }
    this.token = token;
    await this.pushApi.register(token);
    this.enabledState.set(true);
  }

  private async ensureServiceWorker(): Promise<ServiceWorkerRegistration> {
    return navigator.serviceWorker.register('/firebase-messaging-sw.js');
  }

  private showForegroundNotification(payload: MessagePayload): void {
    if (Notification.permission !== 'granted') {
      return;
    }
    const notification = new Notification(payload.notification?.title ?? 'ColivinApp', {
      body: payload.notification?.body ?? 'Tienes una novedad en ColivinApp.',
      icon: '/favicon.ico',
    });
    notification.onclick = () => {
      window.focus();
      const conversationId = payload.data?.['conversationId'];
      if (conversationId) {
        window.location.assign(`/mensajes/${conversationId}`);
      }
    };
  }

  private describe(error: unknown): string {
    return error instanceof Error
      ? error.message
      : 'No se pudieron activar las notificaciones push.';
  }
}
