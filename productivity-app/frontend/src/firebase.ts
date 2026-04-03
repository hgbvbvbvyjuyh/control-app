import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence, type Auth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID ?? '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? '',
};

let _app: FirebaseApp | null = null;
let _auth: Auth | null = null;
let _loggedEnvStatus = false;

function missingRequiredKeys(): string[] {
  const missing: string[] = [];
  if (!firebaseConfig.apiKey) missing.push('VITE_FIREBASE_API_KEY');
  if (!firebaseConfig.authDomain) missing.push('VITE_FIREBASE_AUTH_DOMAIN');
  if (!firebaseConfig.projectId) missing.push('VITE_FIREBASE_PROJECT_ID');
  if (!firebaseConfig.appId) missing.push('VITE_FIREBASE_APP_ID');
  return missing;
}

/** Returns null if required env is missing (app does not crash). */
export function getFirebaseApp(): FirebaseApp | null {
  if (_app) return _app;

  const missing = missingRequiredKeys();
  if (!_loggedEnvStatus) {
    _loggedEnvStatus = true;
    if (missing.length > 0) {
      console.error(
        `[firebase] Missing required env vars: ${missing.join(', ')}. ` +
          'Set them in `productivity-app/frontend/.env`. Firebase Auth is disabled until then.'
      );
    }
  }

  if (missing.length > 0) {
    return null;
  }

  _app = initializeApp(firebaseConfig);
  console.log('[firebase] initialized');
  return _app;
}

export async function getFirebaseAuth(): Promise<Auth | null> {
  if (_auth) return _auth;
  const app = getFirebaseApp();
  if (!app) {
    return null;
  }
  const auth = getAuth(app);
  await setPersistence(auth, browserLocalPersistence);
  _auth = auth;
  return auth;
}
