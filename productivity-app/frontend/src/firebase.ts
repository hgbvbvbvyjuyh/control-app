import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence, type Auth } from 'firebase/auth';

function trimEnv(value: unknown): string {
  if (value === undefined || value === null) return '';
  return String(value).trim();
}

const trimmedFirebaseEnv = {
  apiKey: trimEnv(import.meta.env.VITE_FIREBASE_API_KEY),
  authDomain: trimEnv(import.meta.env.VITE_FIREBASE_AUTH_DOMAIN),
  projectId: trimEnv(import.meta.env.VITE_FIREBASE_PROJECT_ID),
  appId: trimEnv(import.meta.env.VITE_FIREBASE_APP_ID),
  messagingSenderId: trimEnv(import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID),
};

const REQUIRED_ENV_CHECKS: Array<{ envName: string; trimmed: string }> = [
  { envName: 'VITE_FIREBASE_API_KEY', trimmed: trimmedFirebaseEnv.apiKey },
  { envName: 'VITE_FIREBASE_AUTH_DOMAIN', trimmed: trimmedFirebaseEnv.authDomain },
  { envName: 'VITE_FIREBASE_PROJECT_ID', trimmed: trimmedFirebaseEnv.projectId },
  { envName: 'VITE_FIREBASE_APP_ID', trimmed: trimmedFirebaseEnv.appId },
];

function getMissingRequiredEnvNames(): string[] {
  return REQUIRED_ENV_CHECKS.filter(({ trimmed }) => trimmed.length === 0).map(({ envName }) => envName);
}

function logError(message: string, err?: unknown) {
  if (err instanceof Error && err.message) {
    console.error(message, err.message);
  } else {
    console.error(message);
  }
}

let _app: FirebaseApp | null = null;
let _auth: Auth | null = null;

/** Returns null if required env is missing (app does not crash). Always logs the reason when null. */
export function getFirebaseApp(): FirebaseApp | null {
  if (_app) return _app;

  const missing = getMissingRequiredEnvNames();
  if (missing.length > 0) {
    console.error('[firebase] init skipped: missing or empty env →', missing.join(', '));
    return null;
  }

  const firebaseConfig = {
    apiKey: trimmedFirebaseEnv.apiKey,
    authDomain: trimmedFirebaseEnv.authDomain,
    projectId: trimmedFirebaseEnv.projectId,
    appId: trimmedFirebaseEnv.appId,
    messagingSenderId: trimmedFirebaseEnv.messagingSenderId,
  };

  try {
    _app = initializeApp(firebaseConfig);
    if (import.meta.env.DEV) {
      console.log('[firebase] initialized');
    }
    return _app;
  } catch (e) {
    logError('[firebase] initializeApp failed:', e);
    return null;
  }
}

export async function getFirebaseAuth(): Promise<Auth | null> {
  if (_auth) return _auth;
  const app = getFirebaseApp();
  if (!app) {
    console.error('[firebase] getFirebaseAuth: no app (check prior [firebase] logs)');
    return null;
  }
  try {
    const auth = getAuth(app);
    await setPersistence(auth, browserLocalPersistence);
    _auth = auth;
    return auth;
  } catch (e) {
    logError('[firebase] getFirebaseAuth failed:', e);
    return null;
  }
}
