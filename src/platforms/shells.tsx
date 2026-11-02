import type { ReactNode } from 'react';
import type { Account } from '../types';
import { scenarioById } from '../data/scenarios';
import { fmtMoney } from '../sim/metrics';
import { PlatformMark } from '../components/ui';

export interface ShellProps {
  account: Account;
  view: string;
  go: (view: string) => void;
  children: ReactNode;
}

const acctId = (a: Account) => {
  let h = 0;
  for (const ch of a.accountName + a.platform) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return String(h).padStart(10, '7').slice(0, 10);
};

function MetaShell({ account, view, go, children }: ShellProps) {
  const s = scenarioById(account.scenarioId);
  const rail: [string, string, string][] = [['overview', '🏠', 'Account overview'], ['manager', '▦', 'Campaigns'], ['reporting', '📈', 'Ads reporting'], ['audiences', '👥', 'Audiences'], ['billing', '💳', 'Billing & payments'], ['settings', '⚙', 'Settings']];
  return (
    <div className="shell shell-meta">
      <aside className="meta-rail">
        <div className="meta-logo"><PlatformMark id="meta" size={30} /></div>
        {rail.map(([id, icon, label]) => (
          <button key={id} className={view === id || (id === 'manager' && ['new', 'edit'].includes(view)) ? 'on' : ''} title={label} onClick={() => go(id === 'overview' || id === 'audiences' || id === 'settings' || id === 'reporting' ? 'manager' : id)}>{icon}</button>
        ))}
      </aside>
      <div className="shell-main">
        <header className="meta-top">
          <div className="meta-title">Ads Manager</div>
          <div className="meta-acct"><span className="pv-avatar small">{s.emoji}</span>{account.accountName} ({acctId(account)}) ▾</div>
          <div className="spacer" />
          <span className="meta-top-icon">🔔</span><span className="meta-top-icon">?</span>
          <span className="pv-avatar small">🙂</span>
        </header>
        <main className="shell-content">{children}</main>
      </div>
    </div>
  );
}

function TikTokShell({ account, view, go, children }: ShellProps) {
  const nav: [string, string][] = [['dashboard', 'Dashboard'], ['manager', 'Campaign'], ['tools', 'Tools'], ['analytics', 'Analytics']];
  return (
    <div className="shell shell-tiktok">
      <header className="tt-topbar">
        <div className="tt-brand"><PlatformMark id="tiktok" size={26} /><b>TikTok</b><span> for Business</span></div>
        <nav>
          {nav.map(([id, l]) => (
            <button key={id} className={(id === 'manager' && ['manager', 'new', 'edit'].includes(view)) || view === id ? 'on' : ''} onClick={() => go(id === 'dashboard' ? 'dashboard' : 'manager')}>{l}</button>
          ))}
        </nav>
        <div className="spacer" />
        <button className="tt-balance" onClick={() => go('billing')}>Balance: <b>{fmtMoney(account.balance)}</b></button>
        <div className="tt-acct">{account.accountName} ▾<small>ID: {acctId(account)}</small></div>
      </header>
      <main className="shell-content">{children}</main>
    </div>
  );
}

function GoogleShell({ account, view, go, children }: ShellProps) {
  const left: [string, string, string][] = [['new', '+', 'Create'], ['manager', '📣', 'Campaigns'], ['goals', '🏆', 'Goals'], ['tools', '🔧', 'Tools'], ['billing', '💳', 'Billing'], ['admin', '⚙', 'Admin']];
  const id = acctId(account);
  return (
    <div className="shell shell-google">
      <header className="g-top">
        <span className="g-burger">☰</span>
        <span className="g-logo-wrap"><PlatformMark id="google" size={26} /><span className="g-product">Google Ads</span></span>
        <div className="g-acct"><b>{account.accountName}</b><small>{id.slice(0, 3)}-{id.slice(3, 6)}-{id.slice(6, 10)}</small></div>
        <div className="g-search">🔍 Search for a page or campaign</div>
        <div className="spacer" />
        <span className="g-ico">📊</span><span className="g-ico">🔔</span><span className="g-ico">?</span><span className="pv-avatar small">🙂</span>
      </header>
      <div className="g-body">
        <aside className="g-nav">
          {left.map(([vid, icon, l]) => (
            <button key={vid} className={(vid === 'manager' && ['manager', 'edit'].includes(view)) || view === vid ? 'on' : ''} onClick={() => go(['goals', 'tools', 'admin'].includes(vid) ? 'manager' : vid)}>
              <span className={vid === 'new' ? 'g-create' : 'g-nav-ico'}>{icon}</span>
              <small>{l}</small>
            </button>
          ))}
        </aside>
        {(view === 'manager') && (
          <aside className="g-subnav">
            <div className="g-subnav-h">Campaigns</div>
            <a className="on">Campaigns</a><a>Ad groups</a><a>Ads</a><a>Assets</a><a>Audiences, keywords & content</a><a>Change history</a>
            <div className="g-subnav-h">Insights & reports</div>
            <a>Recommendations</a><a>Insights</a><a>Report editor</a>
          </aside>
        )}
        <main className="shell-content">{children}</main>
      </div>
    </div>
  );
}

function XShell({ account, view, go, children }: ShellProps) {
  const nav: [string, string][] = [['manager', 'Campaigns'], ['creatives', 'Creatives'], ['analytics', 'Analytics'], ['tools', 'Tools']];
  return (
    <div className="shell shell-x">
      <header className="x-top">
        <PlatformMark id="x" size={26} />
        <span className="x-product">Ads</span>
        <nav>
          {nav.map(([id, l]) => (
            <button key={id} className={id === 'manager' && ['manager', 'new', 'edit'].includes(view) ? 'on' : ''} onClick={() => go('manager')}>{l} {id !== 'manager' && '▾'}</button>
          ))}
        </nav>
        <div className="spacer" />
        <button className="x-billing" onClick={() => go('billing')}>Billing</button>
        <div className="x-acct"><span className="pv-avatar small">{scenarioById(account.scenarioId).emoji}</span>@{account.accountName.toLowerCase().replace(/[^a-z]/g, '')} ▾</div>
      </header>
      <main className="shell-content">{children}</main>
    </div>
  );
}

function ChatGPTShell({ account, view, go, children }: ShellProps) {
  const nav: [string, string, string][] = [['manager', '▤', 'Campaigns'], ['reporting', '↗', 'Reporting'], ['billing', '▭', 'Billing'], ['settings', '⚙', 'Settings']];
  return (
    <div className="shell shell-chatgpt">
      <aside className="cg-side">
        <div className="cg-brand"><PlatformMark id="chatgpt" size={26} /><b>ChatGPT</b><span className="cg-pill">Ads</span></div>
        <button className="cg-new" onClick={() => go('new')}>＋ New campaign</button>
        {nav.map(([id, icon, l]) => (
          <button key={id} className={`cg-nav ${(id === 'manager' && ['manager', 'edit'].includes(view)) || view === id ? 'on' : ''}`} onClick={() => go(id === 'reporting' || id === 'settings' ? 'manager' : id)}><span>{icon}</span>{l}</button>
        ))}
        <div className="spacer" />
        <div className="cg-acct"><span className="pv-avatar small">{scenarioById(account.scenarioId).emoji}</span><div><b>{account.accountName}</b><small>Ads account</small></div></div>
      </aside>
      <main className="shell-content">{children}</main>
    </div>
  );
}

export const SHELLS = { meta: MetaShell, tiktok: TikTokShell, google: GoogleShell, x: XShell, chatgpt: ChatGPTShell };
