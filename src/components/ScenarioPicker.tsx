import { useState } from 'react';
import { SCENARIOS } from '../data/scenarios';
import { PLATFORMS } from '../platforms/config';
import type { PlatformId } from '../types';
import { PlatformMark } from './ui';
import { fmtMoney } from '../sim/metrics';

export function ScenarioPicker({ platform, onStart, onBack }: { platform: PlatformId; onStart: (scenarioId: string) => void; onBack: () => void }) {
  const p = PLATFORMS[platform];
  const [sel, setSel] = useState(SCENARIOS[0].id);
  return (
    <div className={`scenario-pick sp-${platform}`}>
      <button className="link back" onClick={onBack}>← All platforms</button>
      <div className="sp-head"><PlatformMark id={platform} size={48} /><div><h1>Set up your {p.name} practice account</h1><p className="muted">Pick the business you’ll be advertising. Each brief has its own audience, economics and target cost per result.</p></div></div>
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
        <button className="btn primary big" onClick={() => onStart(sel)}>Open {p.productName} →</button>
      </div>
    </div>
  );
}
