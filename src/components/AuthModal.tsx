import { useState } from 'react';
import { isEmail, useStore } from '../state/store';
import { Modal } from './ui';

export type AuthMode = 'signup' | 'signin' | 'forgot';

/**
 * Sign up or sign in. With `required` (opening a platform without an account), it explains that an account is
 * needed and "Not now" leaves without playing. `onSignedIn` runs after success (default: the same as closing).
 */
export function AuthModal({ mode: initial, onClose, onSignedIn, required = false, platformName }: { mode: AuthMode; onClose: () => void; onSignedIn?: () => void; required?: boolean; platformName?: string }) {
  const store = useStore();
  const [mode, setMode] = useState<AuthMode>(initial);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const signup = mode === 'signup';
  const forgot = mode === 'forgot';
  const validEmail = isEmail(email);
  const validPassword = forgot || (signup ? password.length >= 8 : password.length > 0);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!validEmail || !validPassword || busy) return;
    setBusy(true);
    setError(null);
    if (forgot) {
      const problem = await store.requestReset(email);
      setBusy(false);
      if (problem) setError(problem);
      else setSent(true);
      return;
    }
    const problem = await store.signIn(mode, email, password, name);
    setBusy(false);
    if (problem) setError(problem);
    else (onSignedIn ?? onClose)();
  };

  const go = (m: AuthMode) => { setMode(m); setError(null); setTouched(false); setSent(false); };
  const switchMode = () => go(signup ? 'signin' : 'signup');

  if (forgot && sent) {
    return (
      <Modal onClose={onClose} className="auth-modal">
        <header className="modal-h"><h2>Check your email</h2><button type="button" className="icon-btn" onClick={onClose} aria-label="Close">×</button></header>
        <div className="auth-body">
          <p>If there’s an account for <b>{email.trim()}</b>, we’ve sent it a link to choose a new password. It works once, for an hour.</p>
          <p className="muted small">Nothing there? Check your spam folder, or make sure you used the email you signed up with. You can ask again in a few minutes.</p>
        </div>
        <footer className="modal-f">
          <button type="button" className="link" onClick={() => go('signin')}>Back to sign in</button>
          <div className="spacer" />
          <button type="button" className="btn primary" onClick={onClose}>Done</button>
        </footer>
      </Modal>
    );
  }

  return (
    <Modal onClose={onClose} className="auth-modal">
      <form onSubmit={submit}>
        <header className="modal-h"><h2>{signup ? 'Sign up' : forgot ? 'Reset your password' : 'Sign in'}</h2><button type="button" className="icon-btn" onClick={onClose} aria-label="Close">×</button></header>
        <div className="auth-body">
          <p className="muted">{forgot ? 'Enter the email you signed up with and we’ll send you a link to choose a new password.' : signup
            ? `Create a free account to ${platformName ? `start practising on ${platformName}` : 'start practising'}. Your campaigns are saved so you can pick them up on any device.`
            : required ? `Sign in to ${platformName ? `open ${platformName}` : 'continue'} and load your saved campaigns.` : 'Welcome back. Sign in to load your saved campaigns.'}</p>
          <label className="auth-label"><span>Email</span>
            <input className={`input ${touched && !validEmail ? 'over' : ''}`} type="email" autoFocus autoComplete="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          {touched && !validEmail && <div className="field-error">Enter a valid email address.</div>}
          {!forgot && (
            <>
              <div className="auth-label">
                <div className="auth-label-row">
                  <label htmlFor="auth-password">Password {signup && <span className="muted">(8+ characters)</span>}</label>
                  {!signup && <button type="button" className="link" onClick={() => go('forgot')}>Forgot password?</button>}
                </div>
                <input id="auth-password" className={`input ${touched && !validPassword ? 'over' : ''}`} type="password" autoComplete={signup ? 'new-password' : 'current-password'} value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              {touched && !validPassword && <div className="field-error">{signup ? 'Use at least 8 characters.' : 'Enter your password.'}</div>}
            </>
          )}
          {signup && (
            <label className="auth-label"><span>Name <span className="muted">(optional)</span></span>
              <input className="input" autoComplete="name" placeholder="Used as your ad account name" value={name} onChange={(e) => setName(e.target.value)} />
            </label>
          )}
          {error && <div className="field-error" role="alert">{error}</div>}
          <p className="muted small">
            {forgot ? 'Remembered it? ' : signup ? 'Already have an account? ' : 'New here? '}
            {forgot
              ? <button type="button" className="link" onClick={() => go('signin')}>Back to sign in</button>
              : <button type="button" className="link" onClick={switchMode}>{signup ? 'Sign in' : 'Sign up'}</button>}
          </p>
        </div>
        <footer className="modal-f">
          <button type="button" className="link" onClick={onClose}>{required ? 'Not now' : 'Cancel'}</button>
          <div className="spacer" />
          <button type="submit" className="btn primary" disabled={busy}>{busy ? 'One moment…' : signup ? 'Sign up' : forgot ? 'Send reset link' : 'Sign in'}</button>
        </footer>
      </form>
    </Modal>
  );
}

/** The page behind the link in the reset email (#/reset/<token>): choose a new password and you're signed in. */
export function ResetModal({ token, onDone, onClose, onNewLink }: { token: string; onDone: () => void; onClose: () => void; onNewLink: () => void }) {
  const store = useStore();
  const [password, setPassword] = useState('');
  const [again, setAgain] = useState('');
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expired, setExpired] = useState(false);
  const short = password.length < 8;
  const mismatch = password !== again;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (short || mismatch || busy) return;
    setBusy(true);
    setError(null);
    const problem = await store.resetPassword(token, password);
    setBusy(false);
    if (!problem) return onDone();
    setError(problem);
    if (/expired|already used|isn.t valid/i.test(problem)) setExpired(true);
  };

  if (expired) {
    return (
      <Modal onClose={onClose} className="auth-modal">
        <header className="modal-h"><h2>This link has expired</h2><button type="button" className="icon-btn" onClick={onClose} aria-label="Close">×</button></header>
        <div className="auth-body">
          {store.profile
            ? <p>You’re signed in already, so you don’t need this link. To change your password, sign out and use “Forgot password?” on the sign-in box.</p>
            : <p>Reset links work once, for an hour, and only the newest one works. Ask for a new link and try again.</p>}
        </div>
        <footer className="modal-f">
          <button type="button" className="link" onClick={onClose}>{store.profile ? 'Close' : 'Not now'}</button>
          <div className="spacer" />
          {!store.profile && <button type="button" className="btn primary" onClick={onNewLink}>Send me a new link</button>}
        </footer>
      </Modal>
    );
  }

  return (
    <Modal onClose={onClose} className="auth-modal">
      <form onSubmit={submit}>
        <header className="modal-h"><h2>Choose a new password</h2><button type="button" className="icon-btn" onClick={onClose} aria-label="Close">×</button></header>
        <div className="auth-body">
          <p className="muted">Pick a new password for your AdsSim account. You’ll be signed in, and signed out everywhere else.</p>
          <label className="auth-label"><span>New password <span className="muted">(8+ characters)</span></span>
            <input className={`input ${touched && short ? 'over' : ''}`} type="password" autoFocus autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </label>
          {touched && short && <div className="field-error">Use at least 8 characters.</div>}
          <label className="auth-label"><span>Type it again</span>
            <input className={`input ${touched && mismatch ? 'over' : ''}`} type="password" autoComplete="new-password" value={again} onChange={(e) => setAgain(e.target.value)} />
          </label>
          {touched && !short && mismatch && <div className="field-error">The two passwords don’t match.</div>}
          {error && <div className="field-error" role="alert">{error}</div>}
        </div>
        <footer className="modal-f">
          <button type="button" className="link" onClick={onClose}>Cancel</button>
          <div className="spacer" />
          <button type="submit" className="btn primary" disabled={busy}>{busy ? 'One moment…' : 'Save new password'}</button>
        </footer>
      </form>
    </Modal>
  );
}
