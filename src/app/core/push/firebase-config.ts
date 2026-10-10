/**
 * Public Firebase Web SDK configuration. These values are safe to ship in the
 * client bundle (they identify the project, not grant admin access); access is
 * controlled by Firebase Security Rules / the backend service account.
 */
export interface FirebaseWebConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  /** Web Push certificate key pair (Firebase console → Cloud Messaging). */
  vapidKey: string;
}

export function isFirebaseConfigured(config: FirebaseWebConfig | null | undefined): boolean {
  return (
    !!config &&
    config.apiKey.trim() !== '' &&
    config.projectId.trim() !== '' &&
    config.messagingSenderId.trim() !== '' &&
    config.appId.trim() !== '' &&
    config.vapidKey.trim() !== ''
  );
}
