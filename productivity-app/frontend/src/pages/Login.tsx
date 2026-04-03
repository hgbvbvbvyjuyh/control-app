import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirebaseAuth } from '../firebase';
import { useAuthStore } from '../stores/authStore';

export const Login = () => {
  const navigate = useNavigate();
  const { user, loading, loginWithGoogle } = useAuthStore();

  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (!loading && user) {
      navigate('/', { replace: true });
    }
  }, [loading, user, navigate]);

  const submit = async () => {
    setError('');
    setSubmitting(true);
    try {
      const auth = await getFirebaseAuth();
      if (!auth) {
        setError('Firebase is not configured. Set VITE_FIREBASE_* in frontend .env.');
        return;
      }
      if (mode === 'signup') {
        await createUserWithEmailAndPassword(auth, email.trim(), password);
      } else {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      }
      navigate('/', { replace: true });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Authentication failed';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#020617] text-text">
        <div className="text-secondary/60 text-sm font-semibold">Checking session…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#020617] px-4">
      <div className="w-full max-w-md bg-surface/40 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 shadow-2xl shadow-black/40">
        <div className="flex items-center gap-3 mb-8">
          <img src="/logo.svg" alt="Yourself" className="w-8 h-8" />
          <div>
            <div className="text-white font-black tracking-tight text-xl leading-none">Yourself</div>
            <div className="text-[10px] text-secondary/50 uppercase tracking-[0.25em] font-bold mt-1">
              {mode === 'signup' ? 'Create account' : 'Welcome back'}
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-2xl border border-error/30 bg-error/10 text-error text-sm">
            {error}
          </div>
        )}

        <div className="flex gap-2 mb-6">
          <button
            type="button"
            onClick={() => setMode('login')}
            className={`flex-1 py-2 rounded-xl text-xs font-black uppercase tracking-widest border transition-colors ${
              mode === 'login'
                ? 'bg-secondary/15 border-secondary/30 text-white'
                : 'bg-secondary/5 border-secondary/20 text-secondary hover:text-white'
            }`}
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => setMode('signup')}
            className={`flex-1 py-2 rounded-xl text-xs font-black uppercase tracking-widest border transition-colors ${
              mode === 'signup'
                ? 'bg-secondary/15 border-secondary/30 text-white'
                : 'bg-secondary/5 border-secondary/20 text-secondary hover:text-white'
            }`}
          >
            Sign up
          </button>
        </div>

        <div className="flex flex-col gap-3">
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            type="email"
            className="w-full bg-background/50 border border-white/10 rounded-2xl px-4 py-3 text-sm text-text focus:outline-none focus:ring-1 focus:ring-accent/60"
            autoComplete="email"
          />
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            type="password"
            className="w-full bg-background/50 border border-white/10 rounded-2xl px-4 py-3 text-sm text-text focus:outline-none focus:ring-1 focus:ring-accent/60"
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
          />

          <button
            type="button"
            disabled={submitting || !email.trim() || password.length < 6}
            onClick={submit}
            className="mt-2 w-full bg-accent text-background font-black py-3 rounded-2xl hover:shadow-[0_0_20px_rgba(6,182,212,0.35)] transition-shadow disabled:opacity-40 disabled:cursor-not-allowed uppercase tracking-widest text-xs"
          >
            {submitting ? 'Please wait…' : mode === 'signup' ? 'Create account' : 'Login'}
          </button>

          <div className="my-4 flex items-center gap-3">
            <div className="h-px flex-1 bg-white/10" />
            <div className="text-[10px] text-secondary/50 font-black uppercase tracking-widest">or</div>
            <div className="h-px flex-1 bg-white/10" />
          </div>

          <button
            type="button"
            disabled={submitting}
            onClick={async () => {
              setError('');
              setSubmitting(true);
              try {
                await loginWithGoogle();
                navigate('/', { replace: true });
              } catch (e) {
                const msg = e instanceof Error ? e.message : 'Google login failed';
                setError(msg);
              } finally {
                setSubmitting(false);
              }
            }}
            className="w-full bg-secondary/10 border border-white/10 text-white/90 font-black py-3 rounded-2xl hover:bg-secondary/15 transition-colors disabled:opacity-40 disabled:cursor-not-allowed uppercase tracking-widest text-xs"
          >
            Continue with Google
          </button>

          <div className="text-[10px] text-secondary/50 mt-4 leading-relaxed">
            Session stays signed in across refresh and browser reopen. Logout is only via explicit action.
          </div>
        </div>
      </div>
    </div>
  );
};

