import admin from 'firebase-admin';

let _inited = false;
let _initFailed = false;
let _loggedMissingEnv = false;

export function initFirebaseAdmin() {
  if (_inited || _initFailed) return;

  const projectId = process.env['FIREBASE_PROJECT_ID'];
  const clientEmail = process.env['FIREBASE_CLIENT_EMAIL'];
  const privateKeyRaw = process.env['FIREBASE_PRIVATE_KEY'];

  if (!projectId || !clientEmail || !privateKeyRaw) {
    if (!_loggedMissingEnv) {
      _loggedMissingEnv = true;
      console.error(
        '[firebase-admin] Missing env vars. Required: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY. ' +
          'Set them in `productivity-app/backend/.env`. API auth returns 503 until configured.'
      );
    }
    return;
  }

  const privateKey = privateKeyRaw.replace(/\\n/g, '\n');

  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
    console.log('[firebase-admin] initialized');
  } catch (e) {
    _initFailed = true;
    console.error(
      '[firebase-admin] Failed to initialize:',
      e instanceof Error ? e.message : 'unknown error'
    );
    return;
  }

  _inited = true;
}

export function getAdminAuth() {
  return admin.auth();
}

export function isFirebaseAdminReady(): boolean {
  return _inited;
}

