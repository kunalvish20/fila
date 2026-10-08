import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { api, setToken } from '../lib/api';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import type { Role, User } from '../lib/types';

const DEV_AUTH_BYPASS = import.meta.env.VITE_AUTH_BYPASS === 'true';
const DEV_AUTH_ROLE = (import.meta.env.VITE_AUTH_BYPASS_ROLE || 'ADMIN') as Role;
const DEV_AUTH_USER: User = {
  id: 'local-dev-user',
  name: 'Local Dev User',
  email: import.meta.env.VITE_AUTH_BYPASS_EMAIL || 'admin@filament.local',
  role: DEV_AUTH_ROLE,
  active: true,
  employeeCode: 'LOCAL-DEV',
  department: 'Local Testing'
};
const DEV_BYPASS_STORAGE_KEY = 'filament_dev_auth_bypass';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  bypassLogin: () => void;
  logout: () => void;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    return DEV_AUTH_BYPASS ? DEV_AUTH_USER : null;
  });
  const [loading, setLoading] = useState(!DEV_AUTH_BYPASS);

  const syncSupabaseSession = async (session: Session | null) => {
    if (!session?.access_token) {
      setToken(null);
      setUser(null);
      setLoading(false);
      return;
    }

    setToken(session.access_token);

    try {
      const data = await api<{ user: User }>('/auth/me');
      setUser(data.user);
    } catch (error) {
      console.error('Supabase session user load error:', error);
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const refresh = async () => {
    if (DEV_AUTH_BYPASS) {
      setToken(null);
      setLoading(false);
      return;
    }

    if (isSupabaseConfigured) {
      const {
        data: { session },
        error
      } = await supabase!.auth.getSession();

      console.log('SESSION:', session);
      if (error) console.error('Supabase session read error:', error);
      await syncSupabaseSession(session);
      return;
    }

    try {
      const data = await api<{ user: User }>('/auth/me');
      setUser(data.user);
    } catch {
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    if (!isSupabaseConfigured || DEV_AUTH_BYPASS) return;

    const { data } = supabase!.auth.onAuthStateChange((event, session) => {
      console.log('AUTH EVENT:', event, session);
      void syncSupabaseSession(session);
    });

    return () => data.subscription.unsubscribe();
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    loading,
    async login(email, password) {
      if (DEV_AUTH_BYPASS) {
        setToken(null);
        setUser(DEV_AUTH_USER);
        return;
      }
      if (isSupabaseConfigured) {
        const { data, error } = await supabase!.auth.signInWithPassword({ email, password });
        if (error) throw new Error(error.message);
        if (data.session?.access_token) setToken(data.session.access_token);
        await refresh();
        return;
      }
      const data = await api<{ token: string; user: User }>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
      setToken(data.token);
      setUser(data.user);
    },
    async loginWithGoogle() {
      if (!isSupabaseConfigured) throw new Error('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
      const { error } = await supabase!.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin }
      });
      if (error) {
        console.error('Google login error:', error);
        throw new Error(error.message);
      }
    },
    bypassLogin() {
      if (!DEV_AUTH_BYPASS) return;
      setToken(null);
      localStorage.setItem(DEV_BYPASS_STORAGE_KEY, 'true');
      setUser(DEV_AUTH_USER);
    },
    logout() {
      setToken(null);
      localStorage.removeItem(DEV_BYPASS_STORAGE_KEY);
      setUser(null);
      if (isSupabaseConfigured) void supabase!.auth.signOut();
    },
    refresh
  }), [user, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
