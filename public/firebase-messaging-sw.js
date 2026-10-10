/*
 * Firebase Cloud Messaging service worker (RF-051 external push channel).
 *
 * This file must be served from the site root (`/firebase-messaging-sw.js`),
 * which is why it lives in `public/`.
 *
 * Fill the `firebase.initializeApp(...)` block with the same public Web app
 * configuration used in `src/environments/environment*.ts`. These values are
 * public identifiers, not secrets; do not put a service account here.
 */
/* global firebase, clients */
importScripts('https://www.gstatic.com/firebasejs/13.1.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/13.1.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyBqD-d00krsOOjXH80JhhOjYvoLIsMVVaA',
  authDomain: 'coolivinapp.firebaseapp.com',
  projectId: 'coolivinapp',
  storageBucket: 'coolivinapp.firebasestorage.app',
  messagingSenderId: '1031069559149',
  appId: '1:1031069559149:web:a313294f61b58c0f061264',
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title ?? 'ColivinApp';
  const options = {
    body: payload.notification?.body ?? 'Tienes una novedad en ColivinApp.',
    icon: '/favicon.ico',
    data: payload.data ?? {},
  };
  self.registration.showNotification(title, options);
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const conversationId = event.notification.data?.conversationId;
  const targetUrl = conversationId ? `/mensajes/${conversationId}` : '/notificaciones';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      const existing = windows.find((client) => client.url.includes(targetUrl));
      if (existing) {
        return existing.focus();
      }
      return clients.openWindow(targetUrl);
    }),
  );
});
