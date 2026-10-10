import { FirebaseWebConfig, isFirebaseConfigured } from './firebase-config';

const CONFIG: FirebaseWebConfig = {
  apiKey: 'api-key',
  authDomain: 'demo.firebaseapp.com',
  projectId: 'demo',
  storageBucket: 'demo.appspot.com',
  messagingSenderId: '123',
  appId: '1:123:web:abc',
  vapidKey: 'vapid-key',
};

describe('isFirebaseConfigured', () => {
  it('accepts a complete public configuration', () => {
    expect(isFirebaseConfigured(CONFIG)).toBe(true);
  });

  it('rejects missing or blank values', () => {
    expect(isFirebaseConfigured(null)).toBe(false);
    expect(isFirebaseConfigured({ ...CONFIG, vapidKey: '  ' })).toBe(false);
    expect(isFirebaseConfigured({ ...CONFIG, projectId: '' })).toBe(false);
  });
});
