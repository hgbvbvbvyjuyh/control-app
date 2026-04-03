import { create } from 'zustand';
import { onAuthStateChanged, type User, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { getFirebaseAuth } from '../firebase';

interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
  init: () => void;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

let _listenerStarted = false;

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  loading: true,

  init: () => {
    if (_listenerStarted) return;
    _listenerStarted = true;

    void (async () => {
      try {
        const auth = await getFirebaseAuth();
        if (!auth) {
          set({ user: null, token: null, loading: false });
          return;
        }
        onAuthStateChanged(auth, async (user) => {
          if (!user) {
            set({ user: null, token: null, loading: false });
            return;
          }
          try {
            const token = await user.getIdToken();
            set({ user, token, loading: false });
          } catch {
            // If token retrieval fails, treat as logged out.
            set({ user: null, token: null, loading: false });
          }
        });
      } catch (e) {
        console.error('[auth] Firebase auth failed to start:', e);
        set({ user: null, token: null, loading: false });
      }
    })();
  },

  loginWithGoogle: async () => {
    const auth = await getFirebaseAuth();
    if (!auth) {
      throw new Error('Firebase is not configured. Set VITE_FIREBASE_* in frontend .env.');
    }
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  },

  logout: async () => {
    const auth = await getFirebaseAuth();
    if (auth) {
      await signOut(auth);
    }
    set({ user: null, token: null, loading: false });
  },
}));

export function getAuthToken(): string | null {
  return useAuthStore.getState().token;
}

