import { useState } from 'react';
import { isEmail, useStore } from '../state/store';
import { Modal } from './ui';

export type AuthMode = 'signup' | 'signin';

export function AuthModal({ mode: initial, onClose }: { mode: AuthMode; onClose: () => void }) {
  const store = useStore();
  const [mode, setMode] = useState<AuthMode>(initial);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const signup = mode === 'signup';
  const validEmail = isEmail(email);
  const validPassword = signup ? password.length >= 8 : password.length > 0;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!validEmail || !validPassword || busy) return;
    setBusy(true);
    setError(null);
    const problem = await store.signIn(mode, email, password, name);
    setBusy(false);
    if (problem) setError(problem);
    else onClose();
  };

  const switchMode = () => { setMode(signup ? 'signin' : 'signup'); setError(null); setTouched(false); };

  return (
    <Modal onClose={onClose} className="auth-modal">
      <form onSubmit={submit}>
        <header className="modal-h"><h2>{signup ? 'Sign up' : 'Sign in'}</h2><button type="button" className="icon-btn" onClick={onClose} aria-label="Close">×</button></header>
        <div className="auth-body">
          <p className="muted">{signup
            ? 'You don’t need an account to practise. Create one to save your progress and pick it up on any device.'
            : 'Welcome back. Sign in to load your saved campaigns.'}</p>
          <label className="auth-label"><span>Email</span>
            <input className={`input ${touched && !validEmail ? 'over' : ''}`} type="email" autoFocus autoComplete="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          {touched && !validEmail && <div className="field-error">Enter a valid email address.</div>}
          <label className="auth-label"><span>Password {signup && <span className="muted">(8+ characters)</span>}</span>
            <input className={`input ${touched && !validPassword ? 'over' : ''}`} type="password" autoComplete={signup ? 'new-password' : 'current-password'} value={password} onChange={(e) => setPassword(e.target.value)} />
          </label>
          {touched && !validPassword && <div className="field-error">{signup ? 'Use at least 8 characters.' : 'Enter your password.'}</div>}
          {signup && (
            <label className="auth-label"><span>Name <span className="muted">(optional)</span></span>
              <input className="input" autoComplete="name" placeholder="Used as your ad account name" value={name} onChange={(e) => setName(e.target.value)} />
            </label>
          )}
          {error && <div className="field-error" role="alert">{error}</div>}
          <p className="muted small">
            {signup ? 'Already have an account? ' : 'New here? '}
            <button type="button" className="link" onClick={switchMode}>{signup ? 'Sign in' : 'Sign up'}</button>
            {' '}There’s no password reset yet, so keep your password somewhere safe.
          </p>
        </div>
        <footer className="modal-f">
          <button type="button" className="link" onClick={onClose}>Not now — continue as guest</button>
          <div className="spacer" />
          <button type="submit" className="btn primary" disabled={busy}>{busy ? 'One moment…' : signup ? 'Sign up' : 'Sign in'}</button>
        </footer>
      </form>
    </Modal>
  );
}
