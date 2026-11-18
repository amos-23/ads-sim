import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { apiSupportSend, apiSupportThread, supportToken, type ChatMessage } from '../api';
import { useStore } from '../state/store';

// Where people can reach support outside the chat.
const EMAIL = 'amos.feranmi@gmail.com';
const WHATSAPP = '2348153260295'; // international format, no "+"
const WHATSAPP_LABEL = '+234 815 326 0295';

const SEEN_KEY = 'ads-sim:support-seen';
const read = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };
const write = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* blocked storage */ } };

/**
 * "Help" button + panel: chat with the team, or WhatsApp / email. `context` says where the person is
 * (e.g. "Google Ads · Day 7") so questions arrive with the screen they were on.
 */
export function HelpButton({ variant, context }: { variant: 'sim' | 'floating'; context?: string }) {
  const { profile } = useStore();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<'menu' | 'chat'>('menu');
  const [msgs, setMsgs] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const [name, setName] = useState(() => read('ads-sim:support-name') ?? '');
  const [email, setEmail] = useState(() => read('ads-sim:support-email') ?? '');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [unread, setUnread] = useState(false);
  const last = useRef(0);
  const end = useRef<HTMLDivElement>(null);
  const chatOpen = open && view === 'chat';

  const where = `${context ? context + ' · ' : ''}${window.location.hash || '#/'}`;
  const effectiveEmail = profile?.email ?? email.trim();
  const effectiveName = profile?.name ?? name.trim();

  const poll = useCallback(async () => {
    const token = supportToken();
    if (!token) return;
    try {
      const r = await apiSupportThread(token, last.current);
      if (!r.messages.length) return;
      last.current = r.messages[r.messages.length - 1].id;
      setMsgs((m) => [...m, ...r.messages.filter((x) => !m.some((y) => y.id === x.id))]);
      if (r.messages.some((x) => x.sender === 'admin')) {
        if (chatOpen) write(SEEN_KEY, String(last.current));
        else if (last.current > Number(read(SEEN_KEY) ?? 0)) setUnread(true);
      }
    } catch { /* offline or busy: try again next time */ }
  }, [chatOpen]);

  // Every 4 s while the chat is open; once a minute otherwise (only does anything if they've ever written).
  useEffect(() => {
    void poll();
    const id = setInterval(() => void poll(), chatOpen ? 4000 : 60_000);
    return () => clearInterval(id);
  }, [poll, chatOpen]);

  useEffect(() => {
    if (!chatOpen) return;
    setUnread(false);
    write(SEEN_KEY, String(last.current));
    end.current?.scrollIntoView({ block: 'end' });
  }, [chatOpen, msgs]);

  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open]);

  const send = async () => {
    const body = text.trim();
    if (!body || busy) return;
    const token = supportToken(true);
    if (!token) { setError('Your browser is blocking storage, so chat can’t work. Please use WhatsApp or email instead.'); return; }
    setBusy(true);
    setError(null);
    write('ads-sim:support-name', name);
    write('ads-sim:support-email', email);
    try {
      const r = await apiSupportSend(token, body, { name: effectiveName || undefined, email: effectiveEmail || undefined }, where);
      last.current = Math.max(last.current, r.message.id);
      setMsgs((m) => [...m, r.message]);
      setText('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That didn’t work. Please try again.');
    } finally { setBusy(false); }
  };

  const note = `Hi, I need help with AdsSim.\n(${where})`;
  const wa = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(note)}`;
  const mail = `mailto:${EMAIL}?subject=${encodeURIComponent('AdsSim help')}&body=${encodeURIComponent(`Hi,\n\nI need help with:\n\n\n(${where})`)}`;

  return (
    <>
      <button
        type="button"
        className={variant === 'sim' ? 'sim-btn help-btn' : 'help-fab'}
        aria-expanded={open}
        onClick={() => { setOpen((o) => !o); if (!open && msgs.length) setView('chat'); }}
      >
        {variant === 'sim' ? '💬 Help' : <>💬 <span>Help</span></>}
        {unread && <span className="help-dot" aria-label="New reply" />}
      </button>
      {open && createPortal(
        <div className={`help-panel ${variant}`} role="dialog" aria-label="Help">
          <header>
            <b>{view === 'chat' ? 'Chat with us' : 'How can we help?'}</b>
            <button type="button" className="icon-btn" aria-label="Close help" onClick={() => setOpen(false)}>×</button>
          </header>
          {view === 'menu' ? (
            <div className="help-menu">
              <button type="button" className="help-opt" onClick={() => setView('chat')}>
                <span className="help-ico">💬</span><span><b>Chat with us</b><small>Ask here. We reply as soon as we can.</small></span>
              </button>
              <a className="help-opt" href={wa} target="_blank" rel="noopener noreferrer">
                <span className="help-ico">🟢</span><span><b>WhatsApp</b><small>{WHATSAPP_LABEL}</small></span>
              </a>
              <a className="help-opt" href={mail}>
                <span className="help-ico">✉️</span><span><b>Email</b><small>{EMAIL}</small></span>
              </a>
              <p className="muted small">AdsSim is a practice tool: no real payment is ever needed.</p>
            </div>
          ) : (
            <>
              <div className="help-msgs" aria-live="polite">
                {msgs.length === 0 && <p className="help-intro">Hi! Tell us what you need help with{profile ? '.' : '. If you leave your email below, we can also reply there.'}</p>}
                {msgs.map((m) => <div key={m.id} className={`help-row ${m.sender}`}><p>{m.body}</p></div>)}
                <div ref={end} />
              </div>
              <form className="help-form" onSubmit={(e) => { e.preventDefault(); void send(); }}>
                {msgs.length === 0 && !profile && (
                  <div className="help-who">
                    <input className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} placeholder="Name (optional)" aria-label="Your name" />
                    <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={254} placeholder="Email (optional)" aria-label="Your email" />
                  </div>
                )}
                <div className="help-compose">
                  <textarea
                    className="input"
                    rows={2}
                    maxLength={2000}
                    value={text}
                    placeholder="Write a message…"
                    aria-label="Your message"
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send(); } }}
                  />
                  <button type="submit" className="btn primary" disabled={busy || !text.trim()} aria-label="Send">➤</button>
                </div>
                {error && <p className="field-error" role="alert">{error}</p>}
                <button type="button" className="link" onClick={() => setView('menu')}>← Other ways to reach us</button>
              </form>
            </>
          )}
        </div>,
        document.body,
      )}
    </>
  );
}
