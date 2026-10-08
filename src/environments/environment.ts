import { FirebaseWebConfig } from '../app/core/push/firebase-config';

/**
 * Development Firebase configuration (project `coolivinapp`).
 *
 * These values are public identifiers from the Firebase Web app, not secrets.
 * The `vapidKey` must be generated once in
 * Firebase console → Cloud Messaging → Web Push certificates; while it is
 * empty, push stays disabled cleanly.
 */
export const environment: { production: boolean; firebase: FirebaseWebConfig } = {
  production: false,
  firebase: {
    apiKey: 'AIzaSyBqD-d00krsOOjXH80JhhOjYvoLIsMVVaA',
    authDomain: 'coolivinapp.firebaseapp.com',
    projectId: 'coolivinapp',
    storageBucket: 'coolivinapp.firebasestorage.app',
    messagingSenderId: '1031069559149',
    appId: '1:1031069559149:web:a313294f61b58c0f061264',
    vapidKey: '',
  },
};
