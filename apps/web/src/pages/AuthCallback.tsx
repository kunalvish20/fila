import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { isSupabaseConfigured, supabase } from '../lib/supabase';

function safeRedirectPath(value: string | null) {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return '/';
  return value;
}

export function AuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { refresh } = useAuth();
  const [error, setError] = useState('');
  const handledRef = useRef(false);

  useEffect(() => {
    if (handledRef.current) return;
    handledRef.current = true;

    async function completeGoogleSignIn() {
      const redirectPath = safeRedirectPath(searchParams.get('redirectTo'));

      try {
        if (!isSupabaseConfigured || !supabase) {
          throw new Error('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
        }

        const oauthError = searchParams.get('error_description') || searchParams.get('error');
        if (oauthError) throw new Error(oauthError);

        const code = searchParams.get('code');
        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) throw exchangeError;
        }

        const {
          data: { session },
          error: sessionError
        } = await supabase.auth.getSession();

        console.log('SESSION:', session);
        if (sessionError) throw sessionError;
        if (!session?.access_token) throw new Error('Google sign in completed, but no Supabase session was created.');

        const appUser = await refresh();
        if (!appUser) throw new Error('Supabase session is valid, but the app could not load your user profile.');

        navigate(redirectPath, { replace: true });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Google sign in failed.';
        console.error('Google callback error:', err);
        setError(message);
        navigate(`/login?authError=${encodeURIComponent(message)}`, { replace: true });
      }
    }

    void completeGoogleSignIn();
  }, [navigate, refresh, searchParams]);

  return <div className="screen-center">
    {error ? <div>
      <p className="form-error">{error}</p>
      <Link to="/login">Back to login</Link>
    </div> : 'Completing Google sign in...'}
  </div>;
}
