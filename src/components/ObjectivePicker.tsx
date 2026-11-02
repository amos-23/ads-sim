import { useState } from 'react';
import type { PlatformDef } from '../platforms/config';
import type { Scenario } from '../data/scenarios';
import { Modal } from './ui';

interface Props {
  p: PlatformDef;
  s: Scenario;
  onPick: (objective: string, campaignType?: string, name?: string) => void;
  onCancel: () => void;
}

export function ObjectivePicker({ p, s, onPick, onCancel }: Props) {
  const [sel, setSel] = useState<string>('');
  const [type, setType] = useState<string>('');
  const [name, setName] = useState('');
  const obj = p.objectives.find((o) => o.id === sel);

  if (p.id === 'meta') {
    return (
      <Modal onClose={onCancel} wide className="meta-objective">
        <header className="modal-h"><h2>Create new campaign</h2><button className="icon-btn" onClick={onCancel}>×</button></header>
        <div className="mo-buying"><span>Buying type</span><select className="input" defaultValue="auction"><option value="auction">Auction</option><option disabled>Reservation</option></select></div>
        <h3 className="mo-title">{p.objectiveTitle}</h3>
        <div className="mo-body">
          <ul className="mo-list">
            {p.objectives.map((o) => (
              <li key={o.id}>
                <label className={sel === o.id ? 'on' : ''}>
                  <input type="radio" name="obj" checked={sel === o.id} onChange={() => setSel(o.id)} />
                  <span className="mo-ico">{o.icon}</span>{o.label}
                </label>
              </li>
            ))}
          </ul>
          <div className="mo-detail">
            {obj ? (
              <>
                <div className="mo-art">{obj.icon}</div>
                <h4>{obj.label}</h4>
                <p>{obj.desc}</p>
                <b>Good for:</b>
                <ul className="goodfor">{obj.goodFor.map((g) => <li key={g}>{g}</li>)}</ul>
              </>
            ) : (
              <p className="muted">Your campaign objective is the business goal that you hope to achieve by running your ads. Hover over each one for more information.</p>
            )}
          </div>
        </div>
        <footer className="modal-f">
          <a className="muted small">About campaign objectives</a>
          <div className="spacer" />
          <button className="btn ghost" onClick={onCancel}>Cancel</button>
          <button className="btn primary" disabled={!sel} onClick={() => onPick(sel)}>Continue</button>
        </footer>
      </Modal>
    );
  }

  if (p.id === 'google') {
    const types = p.campaignTypes!.filter((t) => !sel || t.objectives.includes(sel));
    return (
      <div className="g-new">
        <div className="g-new-head"><button className="icon-btn" onClick={onCancel}>×</button><h2>New campaign</h2></div>
        <section className="g-new-sec">
          <h3>{p.objectiveTitle}</h3>
          <p className="muted">Select an objective to tailor your experience to the goals and settings that will work best for your campaign</p>
          <div className="g-obj-grid">
            {p.objectives.map((o) => (
              <button key={o.id} className={`g-obj ${sel === o.id ? 'on' : ''}`} onClick={() => { setSel(o.id); setType(''); }}>
                <span className="g-obj-ico">{o.icon}</span>
                <b>{o.label}</b>
                <span>{o.desc}</span>
                {sel === o.id && <span className="g-check">✓</span>}
              </button>
            ))}
          </div>
        </section>
        {sel && (
          <section className="g-new-sec">
            <h3>Select a campaign type</h3>
            <div className="g-obj-grid types">
              {types.map((t) => (
                <button key={t.id} className={`g-obj ${type === t.id ? 'on' : ''}`} onClick={() => setType(t.id)}>
                  <span className="g-obj-ico">{t.icon}</span>
                  <b>{t.label}</b>
                  <span>{t.desc}</span>
                  {type === t.id && <span className="g-check">✓</span>}
                </button>
              ))}
            </div>
          </section>
        )}
        {sel && type && (
          <section className="g-new-sec">
            <h3>Campaign name</h3>
            <input className="input" value={name} placeholder={`${s.brand} – ${p.campaignTypes!.find((t) => t.id === type)?.label}`} onChange={(e) => setName(e.target.value)} />
          </section>
        )}
        <div className="g-new-foot">
          <button className="btn ghost" onClick={onCancel}>Cancel</button>
          <button className="btn primary" disabled={!sel || !type} onClick={() => onPick(sel, type, name || `${s.brand} – ${p.campaignTypes!.find((t) => t.id === type)?.label}`)}>Continue</button>
        </div>
      </div>
    );
  }

  if (p.id === 'chatgpt') {
    return (
      <div className="cg-new">
        <h1>{p.objectiveTitle}</h1>
        <p className="muted">Choose the result that matters most. You can’t change this after publishing.</p>
        <div className="cg-obj-grid">
          {p.objectives.map((o) => (
            <button key={o.id} className={`cg-obj ${sel === o.id ? 'on' : ''}`} onClick={() => setSel(o.id)}>
              <span className="cg-obj-ico">{o.icon}</span>
              <b>{o.label}</b>
              <span>{o.desc}</span>
            </button>
          ))}
        </div>
        <div className="cg-new-foot">
          <button className="btn ghost" onClick={onCancel}>Cancel</button>
          <button className="btn primary" disabled={!sel} onClick={() => onPick(sel)}>Continue</button>
        </div>
      </div>
    );
  }

  // TikTok & X: grouped list
  const groups = [...new Set(p.objectives.map((o) => o.group ?? ''))];
  return (
    <div className={`grouped-new gn-${p.id}`}>
      <div className="gn-main">
        <h2>{p.objectiveTitle}</h2>
        {p.id === 'tiktok' && (
          <div className="gn-mode">
            <label className="on"><input type="radio" defaultChecked name="mode" /> Manual campaign <small>Full control over targeting and settings</small></label>
            <label><input type="radio" name="mode" disabled /> Smart+ campaign <small>Automated end-to-end (not simulated)</small></label>
          </div>
        )}
        {groups.map((g) => (
          <div key={g} className="gn-group">
            <div className="gn-group-h">{g}</div>
            <div className="gn-items">
              {p.objectives.filter((o) => (o.group ?? '') === g).map((o) => (
                <label key={o.id} className={`gn-item ${sel === o.id ? 'on' : ''}`}>
                  <input type="radio" name="obj" checked={sel === o.id} onChange={() => setSel(o.id)} />
                  <span className="gn-ico">{o.icon}</span>
                  <span><b>{o.label}</b><small>{o.desc}</small></span>
                </label>
              ))}
            </div>
          </div>
        ))}
        <div className="gn-foot">
          <button className="btn ghost" onClick={onCancel}>Cancel</button>
          <button className="btn primary" disabled={!sel} onClick={() => onPick(sel)}>{p.id === 'x' ? 'Next' : 'Continue'}</button>
        </div>
      </div>
      <aside className="gn-side">
        {obj ? <><div className="gn-art">{obj.icon}</div><h3>{obj.label}</h3><p>{obj.desc}</p><p className="muted small">Results will be measured as: <b>{obj.resultLabel}</b></p></> : <p className="muted">Select an objective to see what it optimizes for.</p>}
      </aside>
    </div>
  );
}
