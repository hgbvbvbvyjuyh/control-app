import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence, type Auth } from 'firebase/auth';

function trimEnv(value: unknown): string {
  if (value === undefined || value === null) return '';
  return String(value).trim();
}

/** Raw values from Vite (injected at build/dev time). */
const RAW_FIREBASE_ENV = {
  VITE_FIREBASE_API_KEY: import.meta.env.VITE_FIREBASE_API_KEY,
  VITE_FIREBASE_AUTH_DOMAIN: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  VITE_FIREBASE_PROJECT_ID: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  VITE_FIREBASE_APP_ID: import.meta.env.VITE_FIREBASE_APP_ID,
  VITE_FIREBASE_MESSAGING_SENDER_ID: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
} as const;

const trimmedFirebaseEnv = {
  apiKey: trimEnv(RAW_FIREBASE_ENV.VITE_FIREBASE_API_KEY),
  authDomain: trimEnv(RAW_FIREBASE_ENV.VITE_FIREBASE_AUTH_DOMAIN),
  projectId: trimEnv(RAW_FIREBASE_ENV.VITE_FIREBASE_PROJECT_ID),
  appId: trimEnv(RAW_FIREBASE_ENV.VITE_FIREBASE_APP_ID),
  messagingSenderId: trimEnv(RAW_FIREBASE_ENV.VITE_FIREBASE_MESSAGING_SENDER_ID),
};

// Per-variable runtime snapshot (raw vs trimmed) — catches whitespace-only and quoting issues.
console.log(
  '[firebase] VITE_FIREBASE_API_KEY',
  JSON.stringify({
    rawType: typeof RAW_FIREBASE_ENV.VITE_FIREBASE_API_KEY,
    raw: RAW_FIREBASE_ENV.VITE_FIREBASE_API_KEY,
    trimmed: trimmedFirebaseEnv.apiKey,
    trimmedLength: trimmedFirebaseEnv.apiKey.length,
  })
);
console.log(
  '[firebase] VITE_FIREBASE_AUTH_DOMAIN',
  JSON.stringify({
    rawType: typeof RAW_FIREBASE_ENV.VITE_FIREBASE_AUTH_DOMAIN,
    raw: RAW_FIREBASE_ENV.VITE_FIREBASE_AUTH_DOMAIN,
    trimmed: trimmedFirebaseEnv.authDomain,
    trimmedLength: trimmedFirebaseEnv.authDomain.length,
  })
);
console.log(
  '[firebase] VITE_FIREBASE_PROJECT_ID',
  JSON.stringify({
    rawType: typeof RAW_FIREBASE_ENV.VITE_FIREBASE_PROJECT_ID,
    raw: RAW_FIREBASE_ENV.VITE_FIREBASE_PROJECT_ID,
    trimmed: trimmedFirebaseEnv.projectId,
    trimmedLength: trimmedFirebaseEnv.projectId.length,
  })
);
console.log(
  '[firebase] VITE_FIREBASE_APP_ID',
  JSON.stringify({
    rawType: typeof RAW_FIREBASE_ENV.VITE_FIREBASE_APP_ID,
    raw: RAW_FIREBASE_ENV.VITE_FIREBASE_APP_ID,
    trimmed: trimmedFirebaseEnv.appId,
    trimmedLength: trimmedFirebaseEnv.appId.length,
  })
);
console.log(
  '[firebase] VITE_FIREBASE_MESSAGING_SENDER_ID',
  JSON.stringify({
    rawType: typeof RAW_FIREBASE_ENV.VITE_FIREBASE_MESSAGING_SENDER_ID,
    raw: RAW_FIREBASE_ENV.VITE_FIREBASE_MESSAGING_SENDER_ID,
    trimmed: trimmedFirebaseEnv.messagingSenderId,
    trimmedLength: trimmedFirebaseEnv.messagingSenderId.length,
  })
);

const REQUIRED_ENV_CHECKS: Array<{ envName: string; trimmed: string }> = [
  { envName: 'VITE_FIREBASE_API_KEY', trimmed: trimmedFirebaseEnv.apiKey },
  { envName: 'VITE_FIREBASE_AUTH_DOMAIN', trimmed: trimmedFirebaseEnv.authDomain },
  { envName: 'VITE_FIREBASE_PROJECT_ID', trimmed: trimmedFirebaseEnv.projectId },
  { envName: 'VITE_FIREBASE_APP_ID', trimmed: trimmedFirebaseEnv.appId },
];

function getFirebaseConfigIssues(): string[] {
  const issues: string[] = [];
  for (const { envName, trimmed } of REQUIRED_ENV_CHECKS) {
    if (trimmed.length === 0) {
      issues.push(
        `${envName} is missing or not a non-empty string after trim (undefined, empty, or whitespace-only)`
      );
    }
  }
  return issues;
}

let _app: FirebaseApp | null = null;
let _auth: Auth | null = null;

/** Returns null if required env is missing (app does not crash). Always logs the reason when null. */
export function getFirebaseApp(): FirebaseApp | null {
  if (_app) return _app;

  const issues = getFirebaseConfigIssues();
  if (issues.length > 0) {
    console.error('[firebase] Cannot initialize: invalid or missing required env:\n- ' + issues.join('\n- '));
    console.error(
      '[firebase] Fix: set the variables above in productivity-app/frontend/.env, then restart the Vite dev server (env is read at server start).'
    );
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
    console.log('[firebase] initialized');
    return _app;
  } catch (e) {
    console.error('[firebase] initializeApp() threw — config shape may be wrong or Firebase rejected the app options:', e);
    return null;
  }
}

export async function getFirebaseAuth(): Promise<Auth | null> {
  if (_auth) return _auth;
  const app = getFirebaseApp();
  if (!app) {
    console.error(
      '[firebase] getFirebaseAuth: no Firebase app (see previous [firebase] error logs for the exact failing condition).'
    );
    return null;
  }
  try {
    const auth = getAuth(app);
    await setPersistence(auth, browserLocalPersistence);
    _auth = auth;
    return auth;
  } catch (e) {
    console.error('[firebase] getFirebaseAuth: failed to get auth or set persistence:', e);
    return null;
  }
}
