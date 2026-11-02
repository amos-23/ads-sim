import { useState } from 'react';
import { SCENARIOS } from '../data/scenarios';
import { PLATFORMS } from '../platforms/config';
import type { PlatformId } from '../types';
import { PlatformMark } from './ui';
import { fmtMoney } from '../sim/metrics';

export function ScenarioPicker({ platform, replacing, onStart, onBack }: { platform: PlatformId; replacing?: boolean; onStart: (scenarioId: string) => void; onBack: () => void }) {
  const p = PLATFORMS[platform];
  const [sel, setSel] = useState(SCENARIOS[0].id);
  return (
    <div className={`scenario-pick sp-${platform}`}>
      <button className="link back" onClick={onBack}>← {replacing ? 'Back to my account' : 'All platforms'}</button>
      <div className="sp-head"><PlatformMark id={platform} size={48} /><div><h1>Try a guided {p.name} challenge</h1><p className="muted">Optional: pick a sample business with its own audience, economics and target cost per result.{replacing ? ' This replaces your current practice account.' : ''}</p></div></div>
      <div className="sp-grid">
        {SCENARIOS.map((s) => (
          <button key={s.id} className={`sp-card ${sel === s.id ? 'on' : ''}`} onClick={() => setSel(s.id)}>
            <div className="sp-emoji">{s.emoji}</div>
            <b>{s.brand}</b>
            <small>{s.industry}</small>
            <p>{s.pitch}</p>
            <dl>
              <dt>Goal</dt><dd>{s.goalLabel}</dd>
              <dt>Target CPA</dt><dd>{fmtMoney(s.targetCpa, 0)}</dd>
              <dt>Budget</dt><dd>~{fmtMoney(s.suggestedDailyBudget, 0)}/day</dd>
            </dl>
          </button>
        ))}
      </div>
      <div className="sp-foot">
        <span className="muted">You’ll get $5,000 of simulated ad credit.</span>
        <button className="btn" onClick={onBack}>Cancel</button>
        <button className="btn primary big" onClick={() => onStart(sel)}>Start challenge →</button>
      </div>
    </div>
  );
}
