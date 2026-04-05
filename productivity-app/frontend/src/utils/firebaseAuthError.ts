function readAuthErrorCode(error: unknown): string {
  if (typeof error !== 'object' || error === null) return '';
  if (!('code' in error)) return '';
  const code = (error as { code?: unknown }).code;
  return typeof code === 'string' ? code : '';
}

function trimmedProjectId(): string {
  const v = import.meta.env.VITE_FIREBASE_PROJECT_ID;
  if (v === undefined || v === null) return '';
  return String(v).trim();
}

/**
 * Human-readable copy for Firebase Auth failures.
 * `auth/configuration-not-found` is returned by the backend when Auth is not provisioned for the project
 * or the Web API key cannot call Identity Toolkit (e.g. key restrictions).
 */
export function formatFirebaseAuthError(error: unknown): string {
  const code = readAuthErrorCode(error);

  if (code === 'auth/configuration-not-found') {
    const projectId = trimmedProjectId();
    const consoleUrl = projectId
      ? `https://console.firebase.google.com/project/${encodeURIComponent(projectId)}/authentication/providers`
      : 'https://console.firebase.google.com/';
    return [
      'Firebase Authentication is not set up for this Firebase project (or your API key cannot use it).',
      'Fix: Firebase Console → Authentication → Get started → Sign-in method → enable Email/Password and Google.',
      'If the API key is restricted in Google Cloud Console, allow the Identity Toolkit API for that browser key.',
      `Console: ${consoleUrl}`,
    ].join(' ');
  }

  if (error instanceof Error && error.message) return error.message;
  return 'Authentication failed.';
}
