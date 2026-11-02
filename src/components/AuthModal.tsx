import { useState } from 'react';
import { isEmail, useStore } from '../state/store';
import { Modal } from './ui';

export function AuthModal({ onClose }: { onClose: () => void }) {
  const store = useStore();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const valid = isEmail(email);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!valid || busy) return;
    setBusy(true);
    await store.signIn(email, name);
    onClose();
  };

  return (
    <Modal onClose={onClose} className="auth-modal">
      <form onSubmit={submit}>
        <header className="modal-h"><h2>Sign up (optional)</h2><button type="button" className="icon-btn" onClick={onClose} aria-label="Close">×</button></header>
        <div className="auth-body">
          <p className="muted">You don’t need an account to practise. Add your email to save your progress under your name — no password and no verification email.</p>
          <label className="auth-label"><span>Email</span>
            <input className={`input ${touched && !valid ? 'over' : ''}`} type="email" autoFocus autoComplete="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          {touched && !valid && <div className="field-error">Enter a valid email address.</div>}
          <label className="auth-label"><span>Name <span className="muted">(optional)</span></span>
            <input className="input" autoComplete="name" placeholder="Used as your ad account name" value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <p className="muted small">Already signed up? Enter the same email on any device to get your saved campaigns back. We save your simulator progress and your email, nothing else, and there’s no verification, so only use an email you don’t mind others typing in.</p>
        </div>
        <footer className="modal-f">
          <button type="button" className="link" onClick={onClose}>Not now — continue as guest</button>
          <div className="spacer" />
          <button type="submit" className="btn primary" disabled={busy}>{busy ? 'Saving…' : 'Sign up'}</button>
        </footer>
      </form>
    </Modal>
  );
}
