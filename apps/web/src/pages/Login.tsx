import { FormEvent, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ApiClientError } from '../lib/api';
import { isSupabaseConfigured } from '../lib/supabase';

const DEV_AUTH_BYPASS = import.meta.env.VITE_AUTH_BYPASS === 'true';

export function Login() {
  const { user, login, loginWithGoogle, bypassLogin } = useAuth();
  const [email, setEmail] = useState('admin@filament.local');
  const [password, setPassword] = useState('Admin@12345');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  if (user) return <Navigate to="/" replace />;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setLoading(true); setError('');
    try { await login(email, password); }
    catch (err) { setError(err instanceof ApiClientError ? err.message : 'Login failed'); }
    finally { setLoading(false); }
  }

  async function submitGoogle() {
    setGoogleLoading(true); setError('');
    try { await loginWithGoogle(); }
    catch (err) { setError(err instanceof Error ? err.message : 'Google sign in failed'); setGoogleLoading(false); }
  }

  return <div className="login-page">
    <form className="login-card" onSubmit={submit}>
      <div className="brand-mark large">F</div>
      <p className="eyebrow">Production Workspace</p>
      <h1>FilamentOps</h1>
      <p className="muted">Secure manual filament issue, approval, stock, usage and report tracking.</p>
      <label>Email<input value={email} onChange={(e) => setEmail(e.target.value)} type="email" autoComplete="email" required /></label>
      <label>Password<input value={password} onChange={(e) => setPassword(e.target.value)} type="password" autoComplete="current-password" required /></label>
      {error && <div className="form-error">{error}</div>}
      <button className="primary-btn" disabled={loading}>{loading ? 'Signing in...' : 'Sign in'}</button>
      <button className="google-btn" type="button" onClick={submitGoogle} disabled={googleLoading || !isSupabaseConfigured}>
        {googleLoading ? 'Opening Google...' : 'Continue with Google'}
      </button>
      {DEV_AUTH_BYPASS && <button className="bypass-btn" type="button" onClick={bypassLogin}>Bypass login and open dashboard</button>}
      <div className="demo-logins">
        {isSupabaseConfigured ? <span>Supabase authentication is active.</span> : <span>Add Supabase env values to enable Google login.</span>}
        <span>Local demo: admin@filament.local / Admin@12345</span>
      </div>
    </form>
  </div>;
}
