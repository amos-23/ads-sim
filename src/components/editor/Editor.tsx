import { useMemo, useState } from 'react';
import type { Account, Campaign } from '../../types';
import { PLATFORMS, objectiveOf } from '../../platforms/config';
import { scenarioById } from '../../data/scenarios';
import { AdPreview } from '../../platforms/previews';
import { cloneAd, cloneAdSet, newAd, newAdSet } from '../../sim/factory';
import { creativeQuality } from '../../sim/quality';
import { SECTIONS, type EdCtx } from './sections';
import { validate } from './validate';

export interface EditorProps {
  account: Account;
  initial: Campaign;
  isNew: boolean;
  focus?: { asIdx: number; adIdx: number; level: 'campaign' | 'adset' | 'ad' };
  onPublish: (c: Campaign) => void;
  onCancel: () => void;
}

type Node = { level: 'campaign' | 'adset' | 'ad'; asIdx: number; adIdx: number };

export function Editor({ account, initial, isNew, focus, onPublish, onCancel }: EditorProps) {
  const p = PLATFORMS[account.platform];
  const s = scenarioById(account.scenarioId);
  const [draft, setDraft] = useState<Campaign>(() => structuredClone(initial));
  const [node, setNode] = useState<Node>(focus ?? { level: 'campaign', asIdx: 0, adIdx: 0 });
  const [step, setStep] = useState(0);
  const [showErrors, setShowErrors] = useState(false);
  const set = (fn: (c: Campaign) => void) => setDraft((d) => { const c = structuredClone(d); fn(c); return c; });

  const issues = useMemo(() => validate(draft, p), [draft, p]);
  const asIdx = Math.min(node.asIdx, draft.adSets.length - 1);
  const adIdx = Math.min(node.adIdx, Math.max(0, draft.adSets[asIdx]?.ads.length - 1));
  const ctx: EdCtx = { p, s, acc: account, draft, set, asIdx, adIdx, issues, showErrors };
  const obj = objectiveOf(p, draft.objective);
  const currentAd = draft.adSets[asIdx]?.ads[adIdx];

  const publish = () => {
    if (issues.length) {
      setShowErrors(true);
      const first = issues[0];
      if (p.layout === 'tree') setNode({ level: first.adIdx !== undefined ? 'ad' : first.asIdx !== undefined ? 'adset' : 'campaign', asIdx: first.asIdx ?? 0, adIdx: first.adIdx ?? 0 });
      else setStep(steps.length - 1);
      return;
    }
    const out = structuredClone(draft);
    // Edited ads go back through review, just like the real thing.
    for (const as of out.adSets) for (const ad of as.ads) {
      const before = initial.adSets.flatMap((x) => x.ads).find((a) => a.id === ad.id);
      if (!before || JSON.stringify(before.creative) !== JSON.stringify(ad.creative) || before.status === 'rejected') ad.status = 'in_review';
    }
    onPublish(out);
  };

  const addAdSet = () => set((c) => { c.adSets.push(newAdSet(p.id, s, c.objective, account.day, c.adSets.length + 1)); });
  const dupAdSet = (i: number) => set((c) => { c.adSets.splice(i + 1, 0, cloneAdSet(c.adSets[i], account.day)); });
  const delAdSet = (i: number) => { if (draft.adSets.length > 1) { set((c) => void c.adSets.splice(i, 1)); setNode({ level: 'campaign', asIdx: 0, adIdx: 0 }); } };
  const addAd = (i: number) => { set((c) => { c.adSets[i].ads.push(newAd(p.id, s, obj.label, account.day, c.adSets[i].ads.length + 1, c.objective)); }); setNode({ level: 'ad', asIdx: i, adIdx: draft.adSets[i].ads.length }); };
  const dupAd = (i: number, j: number) => { set((c) => { c.adSets[i].ads.splice(j + 1, 0, cloneAd(c.adSets[i].ads[j], account.day)); }); setNode({ level: 'ad', asIdx: i, adIdx: j + 1 }); };
  const delAd = (i: number, j: number) => { if (draft.adSets[i].ads.length > 1) { set((c) => void c.adSets[i].ads.splice(j, 1)); setNode({ level: 'adset', asIdx: i, adIdx: 0 }); } };

  const renderSections = (ids: string[]) => ids.map((id) => {
    const C = SECTIONS[id];
    return C ? <C key={id + asIdx + ':' + adIdx} {...ctx} /> : null;
  });

  const preview = currentAd && (
    <aside className="ed-preview">
      <div className="ed-preview-h">
        <b>{p.id === 'google' ? 'Preview' : 'Ad preview'}</b>
        <span className={`q-badge q-${creativeQuality(p.id, s, draft, currentAd).label.split(' ')[0].toLowerCase()}`}>Predicted quality: {creativeQuality(p.id, s, draft, currentAd).label}</span>
      </div>
      <AdPreview platform={p.id} c={currentAd.creative} s={s} campaign={draft} keywords={draft.adSets[asIdx].targeting.keywords} />
      <details className="q-details">
        <summary>Why this rating?</summary>
        <ul>{creativeQuality(p.id, s, draft, currentAd).checks.map((ch, i) => <li key={i} className={ch.ok ? 'ok' : 'no'}>{ch.ok ? '✓' : '✗'} {ch.msg}</li>)}</ul>
      </details>
    </aside>
  );

  const errorCount = issues.length;
  const footer = (extra?: React.ReactNode) => (
    <footer className="ed-footer">
      <button className="btn ghost" onClick={onCancel}>{p.id === 'meta' ? 'Close' : 'Cancel'}</button>
      {showErrors && errorCount > 0 && <span className="ed-errors">⛔ {errorCount} error{errorCount > 1 ? 's' : ''}</span>}
      {!showErrors && <span className="muted small">{isNew ? 'Draft' : 'Editing'} · changes are saved when you {p.publishLabel.toLowerCase()}</span>}
      <div className="spacer" />
      {extra}
    </footer>
  );

  /* ----------------------------- Tree layout ----------------------------- */
  if (p.layout === 'tree') {
    const sections = node.level === 'campaign' ? p.treeSections!.campaign : node.level === 'adset' ? p.treeSections!.adset : p.treeSections!.ad;
    const hasErr = (lvl: Node['level'], i?: number, j?: number) => showErrors && issues.some((x) => (lvl === 'campaign' ? x.asIdx === undefined : lvl === 'adset' ? x.asIdx === i && x.adIdx === undefined : x.asIdx === i && x.adIdx === j));
    return (
      <div className={`editor editor-tree ed-${p.id}`}>
        <nav className="ed-tree">
          <button className={`tree-node lvl0 ${node.level === 'campaign' ? 'on' : ''}`} onClick={() => setNode({ level: 'campaign', asIdx: 0, adIdx: 0 })}>
            <span className="tree-ico">📁</span><span className="tree-name">{draft.name || 'Campaign'}</span>{hasErr('campaign') && <span className="tree-err">!</span>}
          </button>
          {draft.adSets.map((as, i) => (
            <div key={as.id}>
              <div className={`tree-node lvl1 ${node.level === 'adset' && asIdx === i ? 'on' : ''}`} onClick={() => setNode({ level: 'adset', asIdx: i, adIdx: 0 })}>
                <span className="tree-ico">▦</span><span className="tree-name">{as.name}</span>{hasErr('adset', i) && <span className="tree-err">!</span>}
                <span className="tree-actions"><button title="Duplicate" onClick={(e) => { e.stopPropagation(); dupAdSet(i); }}>⧉</button>{draft.adSets.length > 1 && <button title="Delete" onClick={(e) => { e.stopPropagation(); delAdSet(i); }}>🗑</button>}</span>
              </div>
              {as.ads.map((ad, j) => (
                <div key={ad.id} className={`tree-node lvl2 ${node.level === 'ad' && asIdx === i && adIdx === j ? 'on' : ''}`} onClick={() => setNode({ level: 'ad', asIdx: i, adIdx: j })}>
                  <span className="tree-ico">▭</span><span className="tree-name">{ad.name}</span>{hasErr('ad', i, j) && <span className="tree-err">!</span>}
                  <span className="tree-actions"><button title="Duplicate" onClick={(e) => { e.stopPropagation(); dupAd(i, j); }}>⧉</button>{as.ads.length > 1 && <button title="Delete" onClick={(e) => { e.stopPropagation(); delAd(i, j); }}>🗑</button>}</span>
                </div>
              ))}
              <button className="tree-add lvl2" onClick={() => addAd(i)}>+ {p.id === 'meta' ? 'Create ad' : 'Create ad'}</button>
            </div>
          ))}
          <button className="tree-add lvl1" onClick={addAdSet}>+ Create {p.levels.adset.toLowerCase()}</button>
        </nav>
        <div className="ed-form">
          <div className="ed-form-h">
            <span className="ed-crumb">{node.level === 'campaign' ? p.levels.campaign : node.level === 'adset' ? p.levels.adset : p.levels.ad}</span>
            <h2>{node.level === 'campaign' ? draft.name : node.level === 'adset' ? draft.adSets[asIdx].name : currentAd?.name}</h2>
          </div>
          {renderSections(sections)}
          {node.level !== 'ad' && (
            <div className="ed-next">
              <button className="btn" onClick={() => setNode(node.level === 'campaign' ? { level: 'adset', asIdx: 0, adIdx: 0 } : { level: 'ad', asIdx, adIdx: 0 })}>Next</button>
            </div>
          )}
        </div>
        {node.level === 'ad' ? preview : <aside className="ed-preview ed-side-info"><SideSummary ctx={ctx} /></aside>}
        {footer(<>
          {node.level !== 'campaign' && <button className="btn ghost" onClick={() => setNode(node.level === 'ad' ? { level: 'adset', asIdx, adIdx: 0 } : { level: 'campaign', asIdx: 0, adIdx: 0 })}>Back</button>}
          <button className="btn primary publish" onClick={publish}>{p.publishLabel}</button>
        </>)}
      </div>
    );
  }

  /* ---------------------------- Stepper layout ---------------------------- */
  const steps = p.steps!(draft);
  const cur = steps[Math.min(step, steps.length - 1)];
  const stepErr = (i: number) => showErrors && steps[i].sections.some((sec) => issues.some((x) => x.section === sec));
  return (
    <div className={`editor editor-stepper ed-${p.id}`}>
      <nav className="ed-steps">
        {p.id === 'google' && <div className="ed-steps-h"><b>{p.campaignTypes?.find((t) => t.id === draft.campaignType)?.label ?? 'Search'} campaign</b><small>{obj.label}</small></div>}
        {steps.map((st, i) => (
          <button key={st.id} className={`ed-step ${i === step ? 'on' : ''} ${i < step ? 'done' : ''}`} onClick={() => setStep(i)}>
            <span className="ed-step-n">{stepErr(i) ? '!' : i < step ? '✓' : i + 1}</span>{st.label}
          </button>
        ))}
      </nav>
      <div className="ed-form">
        <div className="ed-form-h"><h2>{cur.label}</h2></div>
        {(cur.scope === 'adset' || cur.scope === 'ad') && (
          <div className="ed-pickers">
            <label>{p.levels.adset}
              <select className="input" value={asIdx} onChange={(e) => setNode({ level: 'adset', asIdx: Number(e.target.value), adIdx: 0 })}>
                {draft.adSets.map((as, i) => <option key={as.id} value={i}>{as.name}</option>)}
              </select>
            </label>
            <button className="link" onClick={() => { addAdSet(); setNode({ level: 'adset', asIdx: draft.adSets.length, adIdx: 0 }); }}>+ New {p.levels.adset.toLowerCase()}</button>
            {draft.adSets.length > 1 && <button className="link danger" onClick={() => delAdSet(asIdx)}>Remove</button>}
            {(cur.scope === 'ad' || cur.sections.some((x) => x.startsWith('ad.'))) && (
              <>
                <label>{p.levels.ad}
                  <select className="input" value={adIdx} onChange={(e) => setNode({ level: 'ad', asIdx, adIdx: Number(e.target.value) })}>
                    {draft.adSets[asIdx].ads.map((ad, j) => <option key={ad.id} value={j}>{ad.name}</option>)}
                  </select>
                </label>
                <button className="link" onClick={() => addAd(asIdx)}>+ New ad</button>
                <button className="link" onClick={() => dupAd(asIdx, adIdx)}>Duplicate</button>
                {draft.adSets[asIdx].ads.length > 1 && <button className="link danger" onClick={() => delAd(asIdx, adIdx)}>Remove</button>}
              </>
            )}
          </div>
        )}
        {renderSections(cur.sections)}
      </div>
      {cur.sections.some((x) => x.startsWith('ad.')) || cur.scope === 'review' ? preview : <aside className="ed-preview ed-side-info"><SideSummary ctx={ctx} /></aside>}
      {footer(<>
        {step > 0 && <button className="btn ghost" onClick={() => setStep(step - 1)}>Back</button>}
        {step < steps.length - 1
          ? <button className="btn primary" onClick={() => setStep(step + 1)}>Next</button>
          : <button className="btn primary publish" onClick={publish}>{p.publishLabel}</button>}
      </>)}
    </div>
  );
}

function SideSummary({ ctx }: { ctx: EdCtx }) {
  const { s, p } = ctx;
  return (
    <div className="side-summary">
      <div className="side-h">📋 Your brief</div>
      <p><b>{s.brand}</b> — {s.pitch}</p>
      <ul>
        <li>Goal: <b>{s.goalLabel}</b></li>
        <li>Target cost per result: <b>${s.targetCpa}</b></li>
        <li>Suggested budget: <b>${s.suggestedDailyBudget}/day</b></li>
        <li>Ideal customer: {s.idealAge[0]}–{s.idealAge[1]}{s.idealGender !== 'all' ? `, mostly ${s.idealGender === 'female' ? 'women' : 'men'}` : ''}</li>
      </ul>
      <div className="side-h">💡 Tips for {p.name}</div>
      <ul>{s.tips.map((t) => <li key={t}>{t}</li>)}</ul>
    </div>
  );
}
