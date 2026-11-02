import { useEffect, useState } from 'react';
import type { PlatformId } from './types';
import { PLATFORMS } from './platforms/config';
import { SHELLS } from './platforms/shells';
import { useStore } from './state/store';
import { scenarioById } from './data/scenarios';
import { newCampaign } from './sim/factory';
import { Home } from './components/Home';
import { ScenarioPicker } from './components/ScenarioPicker';
import { Manager, Overview, type Focus } from './components/Manager';
import { Editor } from './components/editor/Editor';
import { ObjectivePicker } from './components/ObjectivePicker';
import { Billing, SimBar } from './components/SimBar';
import type { Campaign } from './types';

function useHash() {
  const [hash, setHash] = useState(() => window.location.hash.slice(1) || '/');
  useEffect(() => {
    const h = () => setHash(window.location.hash.slice(1) || '/');
    window.addEventListener('hashchange', h);
    return () => window.removeEventListener('hashchange', h);
  }, []);
  return hash;
}

export const navigate = (path: string) => { window.location.hash = path; };

export default function App() {
  const hash = useHash();
  const [, platform, view = 'manager', arg] = hash.split('/');
  if (platform && platform in PLATFORMS) return <PlatformApp key={platform} platform={platform as PlatformId} view={view} arg={arg} />;
  return <Home open={(p) => navigate(`/${p}`)} />;
}

function PlatformApp({ platform, view, arg }: { platform: PlatformId; view: string; arg?: string }) {
  const store = useStore();
  const account = store.accounts[platform];
  const p = PLATFORMS[platform];
  const [draft, setDraft] = useState<{ c: Campaign; isNew: boolean; focus?: Focus } | null>(null);
  const needsAccount = !account && view !== 'pick';

  useEffect(() => {
    document.title = `${p.productName} · ${p.name} — AdsSim`;
    document.body.dataset.platform = platform;
    return () => { delete document.body.dataset.platform; };
  }, [platform, p]);

  // No business needs to be chosen: first visit drops you straight into a free-play account.
  useEffect(() => {
    if (needsAccount) store.createAccount(platform, 'open', store.profile?.name || store.profile?.email.split('@')[0] || 'My Ad Account');
  }, [needsAccount, platform, store]);

  if (view === 'pick') {
    return <ScenarioPicker platform={platform} replacing={!!account} onBack={() => navigate(account ? `/${platform}` : '/')} onStart={(id) => { store.createAccount(platform, id); navigate(`/${platform}`); }} />;
  }
  if (!account) return null;

  const s = scenarioById(account.scenarioId);
  const Shell = SHELLS[platform];
  const go = (v: string) => navigate(`/${platform}/${v}`);

  let content: React.ReactNode;
  if (view === 'edit' && arg) {
    const existing = account.campaigns.find((c) => c.id === arg);
    const d = draft && draft.c.id === arg ? draft : existing ? { c: existing, isNew: false, focus: draft?.focus } : null;
    content = d ? (
      <Editor
        key={arg}
        account={account}
        initial={d.c}
        isNew={d.isNew}
        focus={d.focus}
        onCancel={() => { setDraft(null); go('manager'); }}
        onPublish={(c) => { store.saveCampaign(platform, c); setDraft(null); go('manager'); }}
      />
    ) : <div className="pad">Campaign not found. <button className="link" onClick={() => go('manager')}>Back</button></div>;
  } else if (view === 'new' && platform !== 'meta') {
    content = <ObjectivePicker p={p} s={s} onCancel={() => go('manager')} onPick={(obj, type, name) => { const c = newCampaign(platform, s, obj, account.day, type); if (name) c.name = name; setDraft({ c, isNew: true }); go(`edit/${c.id}`); }} />;
  } else if (view === 'billing') {
    content = <Billing account={account} />;
  } else if (view === 'dashboard') {
    content = <div className="dashboard"><h1>Dashboard</h1><Overview account={account} /></div>;
  } else {
    content = (
      <>
        <Manager account={account} onCreate={() => go('new')} onEdit={(id, focus) => { setDraft(null); const c = account.campaigns.find((x) => x.id === id)!; setDraft({ c, isNew: false, focus }); go(`edit/${id}`); }} />
        {view === 'new' && platform === 'meta' && (
          <ObjectivePicker p={p} s={s} onCancel={() => go('manager')} onPick={(obj) => { const c = newCampaign(platform, s, obj, account.day); setDraft({ c, isNew: true }); go(`edit/${c.id}`); }} />
        )}
      </>
    );
  }

  return (
    <div className={`platform p-${platform}`}>
      <Shell account={account} view={view} go={go}>{content}</Shell>
      <SimBar account={account} onExit={() => navigate('/')} />
    </div>
  );
}
