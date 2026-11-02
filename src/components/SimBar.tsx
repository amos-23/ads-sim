import { useEffect, useState } from 'react';
import type { Account } from '../types';
import { useStore } from '../state/store';
import { coach, type Insight } from '../sim/coach';
import { scenarioById } from '../data/scenarios';
import { PLATFORMS } from '../platforms/config';
import { adIds, sumStats } from '../sim/engine';
import { dateFor, fmtDate, fmtInt, fmtMoney } from '../sim/metrics';

export function SimBar({ account, onExit }: { account: Account; onExit: () => void }) {
  const store = useStore();
  const [auto, setAuto] = useState(false);
  const [panel, setPanel] = useState<'' | 'coach' | 'brief' | 'log'>('');
  const insights = coach(account);
  const problems = insights.filter((i) => i.severity === 'bad' || i.severity === 'warn').length;

  useEffect(() => {
    if (!auto) return;
    const t = setInterval(() => store.advance(account.platform, 1), 1100);
    return () => clearInterval(t);
  }, [auto, account.platform, store]);

  return (
    <>
      <div className="simbar" role="region" aria-label="Simulation controls">
        <button className="sim-exit" onClick={onExit} title="Back to platform selection">⟵ Platforms</button>
        <div className="sim-day">
          <span className="sim-label">SIMULATION</span>
          <b>Day {account.day}</b>
          <small>{fmtDate(dateFor(account, account.day))}</small>
        </div>
        <button className="sim-btn" onClick={() => store.advance(account.platform, 1)}>+1 day</button>
        <button className="sim-btn" onClick={() => store.advance(account.platform, 7)}>+7 days</button>
        <button className={`sim-btn ${auto ? 'on' : ''}`} onClick={() => setAuto((a) => !a)}>{auto ? '❚❚ Pause' : '▶ Auto'}</button>
        <span className="sim-sep" />
        <button className={`sim-btn ${panel === 'coach' ? 'on' : ''}`} onClick={() => setPanel(panel === 'coach' ? '' : 'coach')}>🎓 Coach{problems > 0 && <span className="sim-badge">{problems}</span>}</button>
        <button className={`sim-btn ${panel === 'brief' ? 'on' : ''}`} onClick={() => setPanel(panel === 'brief' ? '' : 'brief')}>📋 Brief</button>
        <button className={`sim-btn ${panel === 'log' ? 'on' : ''}`} onClick={() => setPanel(panel === 'log' ? '' : 'log')}>🔔 Activity</button>
      </div>
      {panel && (
        <aside className="sim-panel">
          <header><b>{panel === 'coach' ? 'Coach' : panel === 'brief' ? 'Practice brief' : 'Activity'}</b><button className="icon-btn" onClick={() => setPanel('')}>×</button></header>
          {panel === 'coach' && <CoachPanel insights={insights} />}
          {panel === 'brief' && <Brief account={account} />}
          {panel === 'log' && (
            <ul className="log">
              {account.notices.map((n) => <li key={n.id} className={`log-${n.kind}`}><small>Day {n.day}</small>{n.text}</li>)}
            </ul>
          )}
        </aside>
      )}
    </>
  );
}

function CoachPanel({ insights }: { insights: Insight[] }) {
  if (!insights.length) return <p className="muted">Nothing to flag right now. Keep the clock running and check back.</p>;
  const icon = { bad: '⛔', warn: '⚠️', tip: '💡', good: '✅' };
  return (
    <ul className="insights">
      {insights.map((i, n) => (
        <li key={n} className={`ins-${i.severity}`}>
          <div className="ins-h">{icon[i.severity]} <b>{i.title}</b></div>
          {i.where && <div className="ins-where">{i.where}</div>}
          <p>{i.body}</p>
        </li>
      ))}
    </ul>
  );
}

function Brief({ account }: { account: Account }) {
  const store = useStore();
  const s = scenarioById(account.scenarioId);
  const p = PLATFORMS[account.platform];
  const st = sumStats(account, account.campaigns.flatMap((c) => adIds(c)));
  const cpa = st.conversions ? st.spend / st.conversions : 0;
  const score = st.conversions === 0 ? 0 : Math.max(0, Math.min(100, Math.round(100 * (s.targetCpa / cpa) * Math.min(1, st.conversions / 30))));
  const profile = store.profile;
  const go = () => {
    if (account.campaigns.length && !confirm('Starting a sample business replaces your current practice account. Continue?')) return;
    window.location.hash = `/${account.platform}/pick`;
  };
  return (
    <div className="brief">
      <div className="brief-user muted small">{profile ? <>Signed in as <b>{profile.email}</b> · <button className="link" onClick={store.signOut}>Sign out</button></> : 'Playing as guest · progress is saved in this browser. You can sign up from the home page.'}</div>
      <div className="brief-brand"><span>{s.emoji}</span><div><b>{s.brand}</b><small>{s.industry}</small></div></div>
      <p>{s.pitch}</p>
      <dl>
        <dt>{s.open ? 'Mode' : 'Your goal'}</dt><dd>{s.open ? 'Free play' : s.goalLabel}</dd>
        <dt>{s.open ? 'Benchmark' : 'Target'} cost per {s.goal === 'sales' ? 'purchase' : 'lead'}</dt><dd>{fmtMoney(s.targetCpa)}</dd>
        <dt>{s.goal === 'sales' ? 'Average order value' : 'Value per lead'}</dt><dd>{fmtMoney(s.value)}</dd>
        <dt>Landing page</dt><dd className="mono">{s.url}</dd>
      </dl>
      <div className="brief-score">
        <div><small>Spent</small><b>{fmtMoney(st.spend)}</b></div>
        <div><small>{s.goal === 'sales' ? 'Purchases' : 'Leads'}</small><b>{fmtInt(st.conversions)}</b></div>
        <div><small>CPA</small><b className={cpa && cpa <= s.targetCpa ? 'good' : cpa ? 'bad' : ''}>{cpa ? fmtMoney(cpa) : '—'}</b></div>
        <div><small>Score</small><b>{score}/100</b></div>
      </div>
      <p className="muted small">Score rewards hitting your target CPA with enough volume (30+ results).</p>
      <p className="muted small">Balance: {fmtMoney(account.balance)} simulated credit.</p>
      {s.open && <button className="btn" onClick={go}>Try a guided sample business</button>}
      <button className="btn danger-outline" onClick={() => { if (confirm(`Reset your ${p.name} practice account? All campaigns and results will be deleted.`)) store.resetAccount(account.platform); }}>Reset {p.name} account</button>
    </div>
  );
}

export function Billing({ account }: { account: Account }) {
  const store = useStore();
  const p = PLATFORMS[account.platform];
  const days = Array.from({ length: account.day }, (_, i) => account.day - 1 - i);
  const ids = account.campaigns.flatMap((c) => adIds(c));
  return (
    <div className={`billing bill-${p.id}`}>
      <h1>{p.id === 'meta' ? 'Billing & payments' : p.id === 'google' ? 'Billing summary' : 'Billing'}</h1>
      <div className="bill-cards">
        <div className="bill-card"><small>Prepaid balance</small><b>{fmtMoney(account.balance)}</b><div className="row gap-s">{[500, 1000, 5000].map((n) => <button key={n} className="btn" onClick={() => store.update(account.platform, (a) => ({ ...a, balance: +(a.balance + n).toFixed(2) }))}>+ {fmtMoney(n, 0)}</button>)}</div><p className="muted small">Simulated funds — no real money is used.</p></div>
        <div className="bill-card"><small>Total spent</small><b>{fmtMoney(sumStats(account, ids).spend)}</b><p className="muted small">Payment method: Practice card •••• 4242</p></div>
      </div>
      <h3>Transactions</h3>
      <table className="grid-table">
        <thead><tr><th className="l">Date</th><th className="l">Description</th><th>Amount</th></tr></thead>
        <tbody>
          {days.length === 0 && <tr><td colSpan={3} className="empty">No transactions yet.</td></tr>}
          {days.map((d) => <tr key={d}><td className="l">{fmtDate(dateFor(account, d))}</td><td className="l">Ad spend</td><td>{fmtMoney(sumStats(account, ids, d, d).spend)}</td></tr>)}
        </tbody>
      </table>
    </div>
  );
}
