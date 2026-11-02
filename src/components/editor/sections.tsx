import { useState, type ReactNode } from 'react';
import type { Account, Campaign, Keyword, MatchType } from '../../types';
import type { PlatformDef } from '../../platforms/config';
import { bidStrategyOf, objectiveOf } from '../../platforms/config';
import { ALL_INTERESTS, ALL_TOPICS, LOCATIONS, RESTRICTED_TOPICS, locationById, type Scenario } from '../../data/scenarios';
import { MEDIA_PRESETS } from '../../data/media';
import { adStrength, audienceInfo, creativeQuality, keywordQuality } from '../../sim/quality';
import { lookupKeyword } from '../../sim/engine';
import { fmtCompact, fmtMoney } from '../../sim/metrics';
import { uid } from '../../sim/random';
import { Card, ChipInput, Counter, Field, Info, Money, Toggle } from '../ui';
import { MediaBox, readImage } from '../Media';
import type { Issue } from './validate';

export interface EdCtx {
  p: PlatformDef;
  s: Scenario;
  acc: Account;
  draft: Campaign;
  set: (fn: (c: Campaign) => void) => void;
  asIdx: number;
  adIdx: number;
  issues: Issue[];
  showErrors: boolean;
}

const err = (ctx: EdCtx, section: string, scope: 'c' | 'as' | 'ad' = 'c') =>
  ctx.showErrors ? ctx.issues.find((i) => i.section === section && (scope === 'c' || i.asIdx === ctx.asIdx) && (scope !== 'ad' || i.adIdx === ctx.adIdx))?.msg : undefined;

const AGES = Array.from({ length: 53 }, (_, i) => i + 13);

function Radio({ name, value, checked, onChange, label, desc, disabled }: { name: string; value: string; checked: boolean; onChange: (v: string) => void; label: ReactNode; desc?: ReactNode; disabled?: boolean }) {
  return (
    <label className={`radio ${checked ? 'on' : ''} ${disabled ? 'disabled' : ''}`}>
      <input type="radio" name={name} value={value} checked={checked} disabled={disabled} onChange={() => onChange(value)} />
      <span>
        <span className="radio-label">{label}</span>
        {desc && <span className="radio-desc">{desc}</span>}
      </span>
    </label>
  );
}

/* ------------------------------ Campaign level ------------------------------ */

function CampaignName(ctx: EdCtx) {
  const { draft, set, p } = ctx;
  const obj = objectiveOf(p, draft.objective);
  return (
    <Card title={p.id === 'google' ? 'Campaign name' : `${p.levels.campaign} name`} subtitle={p.id === 'meta' ? <>Objective: <b>{obj.label}</b></> : undefined}>
      <Field error={err(ctx, 'c.name')}>
        <input className="input" value={draft.name} onChange={(e) => set((c) => void (c.name = e.target.value))} />
      </Field>
      {p.id !== 'meta' && <p className="muted small">Objective: <b>{obj.label}</b>{draft.campaignType && <> · Type: <b>{p.campaignTypes?.find((t) => t.id === draft.campaignType)?.label}</b></>}</p>}
    </Card>
  );
}

function SpecialCategory({ draft, set }: EdCtx) {
  return (
    <Card title="Special Ad Categories" subtitle="Declare if your ads are related to financial products and services, employment, housing, or social issues, elections or politics. Requirements differ by country.">
      <select className="input" value={draft.specialCategory} onChange={(e) => set((c) => void (c.specialCategory = e.target.value))}>
        <option value="none">No categories declared</option>
        <option value="credit">Financial products and services</option>
        <option value="employment">Employment</option>
        <option value="housing">Housing</option>
        <option value="politics">Social issues, elections or politics</option>
      </select>
      {draft.specialCategory !== 'none' && <p className="note">Some audience options are limited: age must be 18–65+ and gender must be All.</p>}
    </Card>
  );
}

function BudgetFields(ctx: EdCtx, allowLifetime: boolean) {
  const { draft, set, p } = ctx;
  return (
    <div className="row gap">
      {allowLifetime && (
        <Field label="Budget">
          <select className="input" value={draft.budgetType} onChange={(e) => set((c) => void (c.budgetType = e.target.value as 'daily' | 'lifetime'))}>
            <option value="daily">Daily budget</option>
            <option value="lifetime">Lifetime budget</option>
          </select>
        </Field>
      )}
      <Field label={allowLifetime ? ' ' : 'Daily budget'} error={err(ctx, p.supportsCbo ? 'c.cbo' : 'c.budget')}>
        <Money ariaLabel="Budget" value={draft.budget} min={p.minBudget.campaign} onChange={(n) => set((c) => void (c.budget = n ?? 0))} suffix="USD" />
      </Field>
      {draft.budgetType === 'lifetime' && (
        <Field label="Run for" help="The simulation spreads your lifetime budget evenly across the remaining days.">
          <Money ariaLabel="Duration" prefix="" suffix="days" value={draft.durationDays} min={1} onChange={(n) => set((c) => void (c.durationDays = n ?? 1))} />
        </Field>
      )}
    </div>
  );
}

function CampaignCbo(ctx: EdCtx) {
  const { draft, set, p, s } = ctx;
  const on = draft.budgetLevel === 'campaign';
  return (
    <Card title={p.id === 'meta' ? 'Budget' : 'Settings'}>
      <div className="row between">
        <div>
          <b>{p.cboLabel}</b> <Info text={p.id === 'meta' ? 'Distributes your budget across ad sets to get more results, depending on your performance goal choices and bid strategy.' : 'Automatically allocate your campaign budget to the best-performing ad groups.'} />
          <div className="muted small">{on ? `The ${p.levels.adset.toLowerCase()}s share one campaign budget.` : `Set a budget for each ${p.levels.adset.toLowerCase()}.`}</div>
        </div>
        <Toggle on={on} label={p.cboLabel} onChange={(v) => set((c) => { c.budgetLevel = v ? 'campaign' : 'adset'; if (!v) c.budgetType = 'daily'; })} />
      </div>
      {on && BudgetFields(ctx, true)}
      {on && <p className="muted small">You’ll spend an average of {fmtMoney(draft.budgetType === 'daily' ? draft.budget : draft.budget / Math.max(1, draft.durationDays))} per day. Brief suggests ~{fmtMoney(s.suggestedDailyBudget, 0)}/day.{p.id === 'tiktok' && ` Minimum is ${fmtMoney(p.minBudget.campaign, 0)}.`}</p>}
    </Card>
  );
}

function CampaignBudget(ctx: EdCtx) {
  const { p, draft, s } = ctx;
  return (
    <Card title={p.id === 'google' ? 'Budget' : 'Campaign budget'} subtitle={p.id === 'google' ? 'Set your average daily budget for this campaign' : undefined}>
      {BudgetFields(ctx, p.id !== 'google')}
      {p.id === 'google' && <p className="muted small">For the month, you won’t pay more than your daily budget times the average number of days in a month ({fmtMoney(draft.budget * 30.4)}). Some days you might spend more or less than your daily budget.</p>}
      <p className="muted small">Brief suggests about {fmtMoney(s.suggestedDailyBudget, 0)}/day for {s.brand}.</p>
    </Card>
  );
}

function BidFields(ctx: EdCtx, holder: 'campaign' | 'adset') {
  const { p, draft, set, asIdx } = ctx;
  const h = holder === 'campaign' ? draft : draft.adSets[asIdx];
  const strat = bidStrategyOf(p, h.bidStrategy);
  const update = (fn: (x: { bidStrategy: string; bidAmount: number | null }) => void) => set((c) => fn(holder === 'campaign' ? c : c.adSets[asIdx]));
  const amountPrefix = strat.amount === 'roas' ? '' : '$';
  const amountSuffix = strat.amount === 'roas' ? 'x' : strat.amount === 'cpm' ? 'per 1K impr.' : strat.amount === 'cpc' ? 'per click' : 'per result';
  return (
    <>
      {p.id === 'google' ? (
        <div className="stack">
          {p.bidStrategies.map((b) => (
            <Radio key={b.id} name={`bid-${holder}`} value={b.id} checked={h.bidStrategy === b.id} onChange={(v) => update((x) => { x.bidStrategy = v; x.bidAmount = null; })} label={b.label} desc={b.desc} />
          ))}
        </div>
      ) : (
        <Field label="Bid strategy" help={strat.desc}>
          <select className="input" value={h.bidStrategy} onChange={(e) => update((x) => { x.bidStrategy = e.target.value; x.bidAmount = null; })}>
            {p.bidStrategies.map((b) => <option key={b.id} value={b.id}>{b.label}</option>)}
          </select>
          <p className="muted small">{strat.desc}</p>
        </Field>
      )}
      {strat.amount && (
        <Field label={strat.amountLabel} error={err(ctx, holder === 'campaign' ? 'c.bidding' : 'as.bidding', holder === 'campaign' ? 'c' : 'as')}>
          <Money ariaLabel={strat.amountLabel} prefix={amountPrefix} suffix={amountSuffix} step={0.01} value={h.bidAmount} onChange={(n) => update((x) => void (x.bidAmount = n))} />
        </Field>
      )}
    </>
  );
}

function CampaignBidding(ctx: EdCtx) {
  const { p } = ctx;
  return (
    <Card title={p.id === 'google' ? 'Bidding' : 'Bidding'} subtitle={p.id === 'google' ? 'What do you want to focus on?' : 'How you pay for delivery.'}>
      {BidFields(ctx, 'campaign')}
      {p.id === 'google' && <p className="note">Smart bidding strategies (Maximize conversions/value) go through a ~7-day learning period.</p>}
    </Card>
  );
}

function GoogleLocations(ctx: EdCtx) {
  const { draft, set } = ctx;
  const t = draft.adSets[0]?.targeting;
  if (!t) return null;
  const labels = t.locations.map((l) => locationById(l)?.label ?? l);
  return (
    <Card title="Locations" subtitle="Select locations for this campaign">
      <Field error={err(ctx, 'g.locations', 'c')}>
        <ChipInput values={labels} options={LOCATIONS.map((l) => l.label)} placeholder="Enter a location to target" onChange={(v) => set((c) => c.adSets.forEach((s) => (s.targeting.locations = v.map((x) => LOCATIONS.find((l) => l.label === x)!.id))))} />
      </Field>
      <Field label="Languages" help="Select the languages your customers speak.">
        <ChipInput values={t.languages} options={['English', 'Spanish', 'French', 'German', 'Portuguese', 'Hindi', 'Swahili']} placeholder="Start typing or select a language" onChange={(v) => set((c) => c.adSets.forEach((s) => (s.targeting.languages = v)))} />
      </Field>
      <Field label="Networks">
        <label className="check"><input type="checkbox" defaultChecked /> Google Search Partners Network</label>
        <label className="check"><input type="checkbox" /> Google Display Network</label>
      </Field>
    </Card>
  );
}

/* ------------------------------ Ad set level ------------------------------ */

function AdSetName(ctx: EdCtx) {
  const { draft, set, asIdx, p } = ctx;
  const as = draft.adSets[asIdx];
  return (
    <Card title={`${p.id === 'google' && draft.campaignType === 'pmax' ? 'Asset group' : p.levels.adset} name`}>
      <Field error={err(ctx, 'as.name', 'as')}>
        <input className="input" value={as.name} onChange={(e) => set((c) => void (c.adSets[asIdx].name = e.target.value))} />
      </Field>
    </Card>
  );
}

function AdSetGoal(ctx: EdCtx) {
  const { draft, set, asIdx, p, s } = ctx;
  const as = draft.adSets[asIdx];
  const obj = objectiveOf(p, draft.objective);
  const conv = ['sales', 'leads', 'app'].includes(obj.kind);
  return (
    <Card title={p.id === 'meta' ? 'Conversion' : p.id === 'tiktok' ? 'Optimization' : 'Goal'}>
      {conv && (p.id === 'meta' || p.id === 'tiktok') && (
        <Field label={p.id === 'meta' ? 'Conversion location' : 'Optimization location'}>
          <select className="input" defaultValue={obj.kind === 'app' ? 'app' : 'website'}>
            <option value="website">Website</option>
            <option value="app">App</option>
            {p.id === 'meta' && <option value="messaging">Message destinations</option>}
            {p.id === 'meta' && <option value="calls">Calls</option>}
            {obj.kind === 'leads' && <option value="instant">Instant forms</option>}
          </select>
        </Field>
      )}
      <Field label={p.id === 'meta' ? 'Performance goal' : p.id === 'tiktok' ? 'Optimization goal' : 'Goal'}>
        <select className="input" value={as.optimizationGoal} onChange={(e) => set((c) => void (c.adSets[asIdx].optimizationGoal = e.target.value))}>
          {obj.goals.map((g) => <option key={g.id} value={g.id}>{g.label}</option>)}
        </select>
      </Field>
      {conv && (
        <div className="pixel-row">
          <span className="dot dot-green" /> {p.id === 'meta' ? 'Dataset' : p.id === 'tiktok' ? 'Pixel' : 'Conversion tag'}: <b>{s.brand} {p.id === 'meta' ? 'Pixel' : 'Web Events'}</b> · Event: <b>{s.goal === 'sales' ? 'Purchase' : 'Lead'}</b> <span className="muted">· Active</span>
        </div>
      )}
    </Card>
  );
}

function AdSetBudget(ctx: EdCtx) {
  const { draft, set, asIdx, p, s } = ctx;
  if (p.supportsCbo && draft.budgetLevel === 'campaign') {
    return <Card title="Budget & schedule"><p className="muted">Using {p.id === 'meta' ? 'Advantage+ campaign budget' : 'campaign budget optimization'}: {fmtMoney(draft.budget)} {draft.budgetType}. Edit it at the campaign level.</p></Card>;
  }
  const as = draft.adSets[asIdx];
  return (
    <Card title="Budget & schedule">
      <Field label="Daily budget" error={err(ctx, 'as.budget', 'as')} help={`Minimum ${fmtMoney(p.minBudget.adset, 0)} per ${p.levels.adset.toLowerCase()}.`}>
        <Money ariaLabel="Daily budget" value={as.budget} min={p.minBudget.adset} onChange={(n) => set((c) => void (c.adSets[asIdx].budget = n ?? 0))} suffix="USD" />
      </Field>
      <div className="row gap">
        <Field label="Start date"><input className="input" value="Today (simulated)" readOnly /></Field>
        <Field label="End date"><input className="input" value="None — run continuously" readOnly /></Field>
      </div>
      <p className="muted small">Brief suggests ~{fmtMoney(s.suggestedDailyBudget, 0)}/day across the whole campaign.</p>
    </Card>
  );
}

function AdSetBidding(ctx: EdCtx) {
  return <Card title={ctx.p.id === 'x' ? 'Bid strategy' : 'Bidding & optimization'}>{BidFields(ctx, 'adset')}</Card>;
}

function AudienceGauge({ ctx }: { ctx: EdCtx }) {
  const as = ctx.draft.adSets[ctx.asIdx];
  const info = audienceInfo(ctx.p.id, ctx.s, as.targeting);
  const pos = info.size <= 0 ? 0 : Math.min(100, Math.max(4, (Math.log10(info.size) - 4.5) / 4 * 100));
  const unit = ctx.p.id === 'chatgpt' ? 'daily relevant conversations' : 'people';
  return (
    <div className="gauge">
      <div className="gauge-title">{ctx.p.id === 'chatgpt' ? 'Estimated reach' : 'Audience definition'}</div>
      <div className="gauge-bar"><span style={{ left: `${pos}%` }} /></div>
      <div className="gauge-labels"><span>Specific</span><span>Broad</span></div>
      <div className="gauge-status">Your audience is <b>{info.definition.toLowerCase()}</b>.</div>
      <div className="gauge-size">Estimated audience size: <b>{fmtCompact(info.size * 0.85)} – {fmtCompact(info.size * 1.15)}</b> {unit}</div>
      <div className="gauge-fit">Fit with your ideal customer: <b>{info.fit >= 0.95 ? 'Strong' : info.fit >= 0.75 ? 'Moderate' : 'Weak'}</b></div>
      {info.notes.map((n) => <p key={n} className="gauge-note">⚠ {n}</p>)}
      <p className="muted tiny">Estimates are simulated and may vary.</p>
    </div>
  );
}

function Audience(ctx: EdCtx) {
  const { draft, set, asIdx, p } = ctx;
  const t = draft.adSets[asIdx].targeting;
  const upd = (fn: (tt: typeof t) => void) => set((c) => fn(c.adSets[asIdx].targeting));
  const labels = t.locations.map((l) => locationById(l)?.label ?? l);
  const isGoogleNonSearch = p.id === 'google';
  return (
    <Card title={p.id === 'meta' ? 'Audience' : p.id === 'tiktok' ? 'Targeting' : isGoogleNonSearch ? 'Audience signal' : p.id === 'chatgpt' ? 'Audience' : 'Demographics'} subtitle={p.id === 'meta' ? 'Define who you want to see your ads.' : isGoogleNonSearch ? 'Suggest who is most likely to convert. Google uses this as a starting point.' : undefined}>
      <div className="aud-grid">
        <div className="stack">
          {p.id !== 'chatgpt' && p.id !== 'google' && (
            <div className="row between expansion">
              <div>
                <b>{p.expansionLabel}</b> <Info text={p.id === 'meta' ? 'Our ad technology automatically finds your audience. If you share an audience suggestion, we’ll prioritise audiences matching your profile before searching more widely.' : 'Let the algorithm find relevant people beyond the targeting you set.'} />
                <div className="muted small">{t.expansion ? 'Your inputs are used as suggestions.' : 'Only people matching your targeting.'}</div>
              </div>
              <Toggle on={t.expansion} label={p.expansionLabel} onChange={(v) => upd((tt) => void (tt.expansion = v))} />
            </div>
          )}
          {p.id !== 'google' && (
            <Field label="Locations" error={err(ctx, 'as.audience', 'as')}>
              <ChipInput values={labels} options={LOCATIONS.map((l) => l.label)} placeholder="Search locations" onChange={(v) => upd((tt) => void (tt.locations = v.map((x) => LOCATIONS.find((l) => l.label === x)!.id)))} />
            </Field>
          )}
          <div className="row gap">
            <Field label="Age">
              <div className="row gap-s">
                <select className="input" value={t.ageMin} onChange={(e) => upd((tt) => void (tt.ageMin = Number(e.target.value)))}>
                  {AGES.filter((a) => a <= t.ageMax).map((a) => <option key={a} value={a}>{a}</option>)}
                </select>
                <span>–</span>
                <select className="input" value={t.ageMax} onChange={(e) => upd((tt) => void (tt.ageMax = Number(e.target.value)))}>
                  {AGES.filter((a) => a >= t.ageMin).map((a) => <option key={a} value={a}>{a === 65 ? '65+' : a}</option>)}
                </select>
              </div>
            </Field>
            <Field label="Gender">
              <div className="seg">
                {(['all', 'male', 'female'] as const).map((g) => (
                  <button type="button" key={g} className={t.gender === g ? 'on' : ''} onClick={() => upd((tt) => void (tt.gender = g))}>{g === 'all' ? 'All' : g === 'male' ? 'Men' : 'Women'}</button>
                ))}
              </div>
            </Field>
          </div>
          {p.id !== 'chatgpt' && (
            <Field label={p.id === 'meta' ? 'Detailed targeting' : p.id === 'tiktok' ? 'Interests & behaviors' : p.id === 'google' ? 'Interests & detailed demographics' : 'Interests'} help="Include people who match at least one of these interests.">
              <ChipInput values={t.interests} options={ALL_INTERESTS} placeholder="Add demographics, interests or behaviours" onChange={(v) => upd((tt) => void (tt.interests = v))} />
            </Field>
          )}
        </div>
        <AudienceGauge ctx={ctx} />
      </div>
    </Card>
  );
}

function Placements(ctx: EdCtx) {
  const { draft, set, asIdx, p } = ctx;
  const t = draft.adSets[asIdx].targeting;
  const upd = (fn: (tt: typeof t) => void) => set((c) => fn(c.adSets[asIdx].targeting));
  const groups = [...new Set(p.placements.map((x) => x.group))];
  return (
    <Card title="Placements" subtitle={p.id === 'meta' ? 'Choose where your ads appear across Meta technologies.' : undefined}>
      <Radio name="pl" value="auto" checked={t.autoPlacements} onChange={() => upd((tt) => void (tt.autoPlacements = true))} label={p.autoPlacementLabel} desc={p.id === 'meta' ? 'Use Advantage+ placements to maximise your budget and help show your ads to more people.' : 'Automatically show your ads across supported placements.'} />
      <Radio name="pl" value="manual" checked={!t.autoPlacements} onChange={() => upd((tt) => { tt.autoPlacements = false; if (!tt.placements.length) tt.placements = [p.placements[0].id]; })} label={p.id === 'meta' ? 'Manual placements' : 'Select placement'} desc="Manually choose the places to show your ad. The fewer you select, the higher your costs." />
      {!t.autoPlacements && (
        <div className="placements">
          {groups.map((g) => (
            <div key={g}>
              {groups.length > 1 && <div className="pl-group">{g}</div>}
              {p.placements.filter((x) => x.group === g).map((pl) => (
                <label className="check" key={pl.id}>
                  <input type="checkbox" checked={t.placements.includes(pl.id)} onChange={(e) => upd((tt) => void (tt.placements = e.target.checked ? [...tt.placements, pl.id] : tt.placements.filter((x) => x !== pl.id)))} />
                  {pl.label}{pl.desc && <span className="muted small"> — {pl.desc}</span>}
                </label>
              ))}
            </div>
          ))}
          {err(ctx, 'as.placements', 'as') && <div className="field-error">{err(ctx, 'as.placements', 'as')}</div>}
        </div>
      )}
    </Card>
  );
}

const parseKeyword = (line: string): Keyword | null => {
  const l = line.trim();
  if (!l) return null;
  let match: MatchType = 'broad';
  let text = l;
  if (/^\[.*\]$/.test(l)) { match = 'exact'; text = l.slice(1, -1); }
  else if (/^".*"$/.test(l)) { match = 'phrase'; text = l.slice(1, -1); }
  return { id: uid('kw'), text: text.toLowerCase().trim(), match };
};
const kwToLine = (k: Keyword) => (k.match === 'exact' ? `[${k.text}]` : k.match === 'phrase' ? `"${k.text}"` : k.text);

function Keywords(ctx: EdCtx) {
  const { draft, set, asIdx, p, s } = ctx;
  const kws = draft.adSets[asIdx].targeting.keywords;
  const [text, setText] = useState(kws.map(kwToLine).join('\n'));
  const commit = (v: string) => {
    setText(v);
    set((c) => {
      const old = c.adSets[asIdx].targeting.keywords;
      c.adSets[asIdx].targeting.keywords = v.split('\n').map(parseKeyword).filter(Boolean).map((k) => old.find((o) => o.text === k!.text && o.match === k!.match) ?? k!) as Keyword[];
    });
  };
  if (p.id === 'x') {
    return (
      <Card title="Keywords" subtitle="Reach people who searched for, posted or engaged with posts containing these keywords.">
        <ChipInput values={kws.map((k) => k.text)} options={s.keywords.map((k) => k.text)} placeholder="Add keywords" onChange={(v) => set((c) => void (c.adSets[asIdx].targeting.keywords = v.map((t) => kws.find((k) => k.text === t) ?? { id: uid('kw'), text: t, match: 'broad' })))} />
      </Card>
    );
  }
  const ad = draft.adSets[asIdx].ads[0];
  return (
    <Card title="Keywords" subtitle="Keywords are words or phrases that are used to match your ads with the terms people are searching for.">
      <div className="kw-grid">
        <Field label="Enter or paste keywords" help='Use match types: keyword = broad match, "keyword" = phrase match, [keyword] = exact match. One per line.' error={err(ctx, 'as.keywords', 'as')}>
          <textarea className="input mono" rows={8} value={text} placeholder={'coffee subscription\n"buy coffee beans"\n[specialty coffee]'} onChange={(e) => commit(e.target.value)} />
        </Field>
        <div className="kw-ideas">
          <div className="kw-ideas-h">Get keyword ideas <Info text="Simulated Keyword Planner data for the United States." /></div>
          <table className="mini">
            <thead><tr><th>Keyword</th><th>Avg. monthly searches</th><th>Top of page bid</th><th /></tr></thead>
            <tbody>
              {s.keywords.map((k) => (
                <tr key={k.text}>
                  <td>{k.text}</td>
                  <td>{fmtCompact(k.volume * 30)}</td>
                  <td>{fmtMoney(k.cpc * 0.7)} – {fmtMoney(k.cpc * 2.1)}</td>
                  <td><button type="button" className="link" onClick={() => commit((text ? text + '\n' : '') + `"${k.text}"`)}>+ Add</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {kws.length > 0 && (
        <table className="mini kw-table">
          <thead><tr><th>Keyword</th><th>Match type</th><th>Est. daily searches</th><th>Est. Quality Score <Info text="Based on expected CTR, ad relevance (does the keyword appear in your headlines?) and landing page experience." /></th></tr></thead>
          <tbody>
            {kws.map((k) => {
              const lk = lookupKeyword(k.text, s);
              const q = keywordQuality(k, ad, s);
              return (
                <tr key={k.id}>
                  <td>{kwToLine(k)}</td>
                  <td>{k.match[0].toUpperCase() + k.match.slice(1)} match</td>
                  <td>{fmtCompact(lk.volume * ({ broad: 2.6, phrase: 1, exact: 0.45 } as const)[k.match])}</td>
                  <td><b className={q.qs >= 7 ? 'good' : q.qs >= 5 ? '' : 'bad'}>{q.qs}/10</b>{lk.lowIntent && <span className="muted small"> · low purchase intent</span>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </Card>
  );
}

function Topics(ctx: EdCtx) {
  const { draft, set, asIdx, s } = ctx;
  const t = draft.adSets[asIdx].targeting;
  return (
    <Card title="Conversation topics" subtitle="Your ad can appear below answers in conversations about these topics. ChatGPT ads are contextual — they don’t use your chat history for targeting.">
      <div className="topic-grid">
        {ALL_TOPICS.map((tp) => {
          const on = t.topics.includes(tp);
          const restricted = RESTRICTED_TOPICS.includes(tp);
          return (
            <button type="button" key={tp} className={`topic ${on ? 'on' : ''} ${restricted ? 'restricted' : ''}`} onClick={() => set((c) => { const tt = c.adSets[asIdx].targeting; tt.topics = on ? tt.topics.filter((x) => x !== tp) : [...tt.topics, tp]; })}>
              {on ? '✓ ' : ''}{tp}{restricted && <small>Restricted</small>}{s.chatTopics.includes(tp) && !restricted && <small className="rec">Relevant</small>}
            </button>
          );
        })}
      </div>
      {err(ctx, 'as.topics', 'as') && <div className="field-error">{err(ctx, 'as.topics', 'as')}</div>}
      <div className="row between expansion">
        <div><b>Broaden to related topics</b><div className="muted small">Also show in closely related conversations.</div></div>
        <Toggle on={t.expansion} onChange={(v) => set((c) => void (c.adSets[asIdx].targeting.expansion = v))} />
      </div>
    </Card>
  );
}

/* --------------------------------- Ad level --------------------------------- */

function AdName(ctx: EdCtx) {
  const { draft, set, asIdx, adIdx } = ctx;
  const ad = draft.adSets[asIdx].ads[adIdx];
  return (
    <Card title="Ad name">
      <input className="input" value={ad.name} onChange={(e) => set((c) => void (c.adSets[asIdx].ads[adIdx].name = e.target.value))} />
      {ad.status === 'rejected' && <p className="note bad">⛔ Rejected: {ad.reviewNote} Fix and republish to request another review.</p>}
    </Card>
  );
}

function Identity(ctx: EdCtx) {
  const { draft, set, asIdx, adIdx, p, s } = ctx;
  const cr = draft.adSets[asIdx].ads[adIdx].creative;
  return (
    <Card title={p.id === 'meta' ? 'Identity' : p.identityLabel} subtitle={p.identityHelp}>
      <Field label={p.id === 'meta' ? 'Facebook Page' : undefined} error={err(ctx, 'ad.identity', 'ad')}>
        <div className="identity">
          <span className="pv-avatar">{s.emoji}</span>
          <input className="input" value={cr.identity} onChange={(e) => set((c) => void (c.adSets[asIdx].ads[adIdx].creative.identity = e.target.value))} />
        </div>
      </Field>
      {p.id === 'meta' && <Field label="Instagram account"><div className="identity"><span className="pv-avatar">{s.emoji}</span><input className="input" readOnly value={'@' + s.brand.toLowerCase().replace(/[^a-z]/g, '')} /></div></Field>}
    </Card>
  );
}

function Format(ctx: EdCtx) {
  const { draft, set, asIdx, adIdx, p } = ctx;
  const cr = draft.adSets[asIdx].ads[adIdx].creative;
  const labels: Record<string, [string, string]> = {
    image: ['Single image', 'One image'],
    video: ['Single video', 'One video'],
    carousel: ['Carousel', 'Two or more scrollable images or videos'],
    none: ['Text only', 'No media'],
  };
  return (
    <Card title={p.id === 'meta' ? 'Ad setup' : 'Ad format'}>
      <div className="stack">
        {p.mediaKinds.map((k) => (
          <Radio key={k} name="fmt" value={k} checked={cr.mediaKind === k} onChange={(v) => set((c) => void (c.adSets[asIdx].ads[adIdx].creative.mediaKind = v as typeof cr.mediaKind))} label={labels[k][0]} desc={labels[k][1]} />
        ))}
      </div>
      {cr.mediaKind !== 'none' && (
        <Field label="Aspect ratio">
          <div className="seg">
            {p.aspects.map((a) => <button type="button" key={a} className={cr.aspect === a ? 'on' : ''} onClick={() => set((c) => void (c.adSets[asIdx].ads[adIdx].creative.aspect = a))}>{a}</button>)}
          </div>
        </Field>
      )}
    </Card>
  );
}

function Media(ctx: EdCtx) {
  const { draft, set, asIdx, adIdx, s, p } = ctx;
  const cr = draft.adSets[asIdx].ads[adIdx].creative;
  if (cr.mediaKind === 'none') return null;
  const upd = (fn: (x: typeof cr) => void) => set((c) => fn(c.adSets[asIdx].ads[adIdx].creative));
  return (
    <Card title={p.id === 'chatgpt' ? 'Image' : cr.mediaKind === 'video' ? 'Video' : 'Media'} subtitle="Choose from your media library or upload an image.">
      <div className="media-lib">
        {MEDIA_PRESETS.map((m) => (
          <button type="button" key={m.id} className={`media-pick ${!cr.mediaUpload && cr.mediaPreset === m.id ? 'on' : ''}`} onClick={() => upd((x) => { x.mediaPreset = m.id; x.mediaUpload = undefined; })} title={m.note}>
            <MediaBox c={{ ...cr, mediaPreset: m.id, mediaUpload: undefined, overlay: '', mediaKind: 'image' }} emoji={s.emoji} aspect="1:1" />
            <span>{m.label}</span>
          </button>
        ))}
        <label className={`media-pick upload ${cr.mediaUpload ? 'on' : ''}`}>
          {cr.mediaUpload ? <img src={cr.mediaUpload} alt="" /> : <span className="upload-ico">⤒</span>}
          <span>Upload image</span>
          <input type="file" accept="image/*" hidden onChange={async (e) => { const f = e.target.files?.[0]; if (f) { const data = await readImage(f); upd((x) => void (x.mediaUpload = data)); } }} />
        </label>
      </div>
      {p.id !== 'chatgpt' && (
        <Field label="Text on media (optional)" help="Text overlaid on the image or video. Short is better.">
          <input className="input" value={cr.overlay} maxLength={80} placeholder="e.g. 30% OFF YOUR FIRST BAG" onChange={(e) => upd((x) => void (x.overlay = e.target.value))} />
        </Field>
      )}
    </Card>
  );
}

function AdText(ctx: EdCtx) {
  const { draft, set, asIdx, adIdx, p } = ctx;
  const cr = draft.adSets[asIdx].ads[adIdx].creative;
  const get = (f: string) => (f === 'primaryText' ? cr.primaryText : f === 'headline' ? cr.headlines[0] ?? '' : cr.descriptions[0] ?? '');
  const put = (f: string, v: string) => set((c) => {
    const x = c.adSets[asIdx].ads[adIdx].creative;
    if (f === 'primaryText') x.primaryText = v;
    else if (f === 'headline') x.headlines[0] = v;
    else x.descriptions[0] = v;
  });
  const e = err(ctx, 'ad.text', 'ad');
  return (
    <Card title={p.id === 'meta' ? 'Ad creative' : p.id === 'x' ? 'Post' : 'Ad details'}>
      {p.textFields.map((f) => (
        <Field key={f.field} label={f.label} help={f.help} right={<Counter value={get(f.field)} limit={f.limit} rec={f.recommended} />}>
          {f.multiline
            ? <textarea className="input" rows={3} value={get(f.field)} placeholder={f.placeholder} onChange={(ev) => put(f.field, ev.target.value)} />
            : <input className="input" value={get(f.field)} placeholder={f.placeholder} onChange={(ev) => put(f.field, ev.target.value)} />}
        </Field>
      ))}
      {e && <div className="field-error">{e}</div>}
      {p.ctas.length > 0 && (
        <Field label="Call to action">
          <select className="input" value={cr.cta} onChange={(ev) => set((c) => void (c.adSets[asIdx].ads[adIdx].creative.cta = ev.target.value))}>
            {p.ctas.map((x) => <option key={x}>{x}</option>)}
          </select>
        </Field>
      )}
    </Card>
  );
}

function Destination(ctx: EdCtx) {
  const { draft, set, asIdx, adIdx, s, p } = ctx;
  const cr = draft.adSets[asIdx].ads[adIdx].creative;
  return (
    <Card title="Destination" subtitle={p.id === 'meta' ? 'Tell us where to send people immediately after they tap or click your ad.' : undefined}>
      <Field label="Website URL" error={err(ctx, 'ad.destination', 'ad')} help="Must be a full https:// address.">
        <input className="input" value={cr.url} placeholder={s.url} onChange={(e) => set((c) => void (c.adSets[asIdx].ads[adIdx].creative.url = e.target.value.trim()))} />
      </Field>
      {!cr.url && <button type="button" className="link" onClick={() => set((c) => void (c.adSets[asIdx].ads[adIdx].creative.url = s.url))}>Use {s.url}</button>}
      <Field label="URL parameters (optional)"><input className="input mono" placeholder="utm_source=…&utm_medium=paid" /></Field>
    </Card>
  );
}

function StrengthMeter({ label, score }: { label: string; score: number }) {
  return (
    <div className={`strength s${score}`}>
      <div className="strength-ring"><span>{label}</span></div>
      <div className="strength-steps">{['Poor', 'Average', 'Good', 'Excellent'].map((l, i) => <i key={l} className={i <= score ? 'on' : ''} />)}</div>
    </div>
  );
}

function Rsa(ctx: EdCtx) {
  const { draft, set, asIdx, adIdx, s } = ctx;
  const as = draft.adSets[asIdx];
  const cr = as.ads[adIdx].creative;
  const upd = (fn: (x: typeof cr) => void) => set((c) => fn(c.adSets[asIdx].ads[adIdx].creative));
  const str = adStrength(cr, as.targeting.keywords, s);
  const isSearch = (draft.campaignType ?? 'search') === 'search';
  return (
    <Card title={isSearch ? 'Ads' : 'Assets'} subtitle={isSearch ? 'Responsive search ad — Google mixes and matches your headlines and descriptions.' : 'Text assets are combined with your images automatically.'} right={<StrengthMeter label={str.label} score={str.score} />}>
      <Field label="Final URL" help="The page people reach after they click your ad." error={err(ctx, 'ad.rsa', 'ad')}>
        <input className="input" value={cr.url} placeholder={s.url} onChange={(e) => upd((x) => void (x.url = e.target.value.trim()))} />
      </Field>
      {!cr.url && <button type="button" className="link" onClick={() => upd((x) => void (x.url = s.url))}>Use {s.url}</button>}
      {isSearch && (
        <Field label="Display path" help="Optional. Text added to your display URL.">
          <div className="row gap-s">
            <span className="muted">{(() => { try { return new URL(cr.url || s.url).hostname; } catch { return 'example.com'; } })()} /</span>
            <input className="input" maxLength={15} value={cr.displayPath[0]} onChange={(e) => upd((x) => void (x.displayPath[0] = e.target.value))} />
            <span>/</span>
            <input className="input" maxLength={15} value={cr.displayPath[1]} onChange={(e) => upd((x) => void (x.displayPath[1] = e.target.value))} />
          </div>
        </Field>
      )}
      <Field label="Business name"><input className="input" value={cr.identity} maxLength={25} onChange={(e) => upd((x) => void (x.identity = e.target.value))} /></Field>
      <div className="rsa-list">
        <div className="field-label"><span>Headlines {cr.headlines.filter(Boolean).length}/15</span></div>
        {cr.headlines.map((h, i) => (
          <div className="rsa-row" key={i}>
            <input className={`input ${h.length > 30 ? 'over' : ''}`} value={h} placeholder={`Headline ${i + 1}`} onChange={(e) => upd((x) => void (x.headlines[i] = e.target.value))} />
            <Counter value={h} limit={30} />
            {cr.headlines.length > 3 && <button type="button" className="icon-btn" aria-label="Remove headline" onClick={() => upd((x) => void x.headlines.splice(i, 1))}>×</button>}
          </div>
        ))}
        {cr.headlines.length < 15 && <button type="button" className="link" onClick={() => upd((x) => void x.headlines.push(''))}>+ Headline</button>}
      </div>
      <div className="rsa-list">
        <div className="field-label"><span>Descriptions {cr.descriptions.filter(Boolean).length}/4</span></div>
        {cr.descriptions.map((d, i) => (
          <div className="rsa-row" key={i}>
            <input className={`input ${d.length > 90 ? 'over' : ''}`} value={d} placeholder={`Description ${i + 1}`} onChange={(e) => upd((x) => void (x.descriptions[i] = e.target.value))} />
            <Counter value={d} limit={90} />
            {cr.descriptions.length > 2 && <button type="button" className="icon-btn" aria-label="Remove description" onClick={() => upd((x) => void x.descriptions.splice(i, 1))}>×</button>}
          </div>
        ))}
        {cr.descriptions.length < 4 && <button type="button" className="link" onClick={() => upd((x) => void x.descriptions.push(''))}>+ Description</button>}
      </div>
      {str.tips.length > 0 && <ul className="tips">{str.tips.map((t) => <li key={t}>{t}</li>)}</ul>}
    </Card>
  );
}

/* --------------------------------- Review --------------------------------- */

function Review(ctx: EdCtx) {
  const { draft, p, s, issues } = ctx;
  const obj = objectiveOf(p, draft.objective);
  return (
    <Card title="Review your campaign" subtitle={issues.length ? `${issues.length} issue${issues.length > 1 ? 's' : ''} to fix before publishing` : 'Everything looks good. Your ads will be reviewed before they start running.'}>
      {issues.length > 0 && <ul className="issues">{issues.map((i, n) => <li key={n}>⛔ {i.msg}</li>)}</ul>}
      <dl className="review">
        <dt>Campaign</dt><dd>{draft.name}</dd>
        <dt>Objective</dt><dd>{obj.label}</dd>
        {draft.campaignType && <><dt>Type</dt><dd>{p.campaignTypes?.find((t) => t.id === draft.campaignType)?.label}</dd></>}
        <dt>Budget</dt><dd>{fmtMoney(draft.budget)} {draft.budgetType}</dd>
        <dt>Bidding</dt><dd>{bidStrategyOf(p, p.bidLevel === 'campaign' ? draft.bidStrategy : draft.adSets[0]?.bidStrategy).label}</dd>
        {draft.adSets.map((as) => (
          <div key={as.id} className="review-set">
            <dt>{p.levels.adset}</dt>
            <dd>
              <b>{as.name}</b> · {as.targeting.locations.join(', ')} · {as.targeting.ageMin}–{as.targeting.ageMax === 65 ? '65+' : as.targeting.ageMax}
              {as.targeting.interests.length > 0 && <> · {as.targeting.interests.join(', ')}</>}
              {as.targeting.keywords.length > 0 && <> · {as.targeting.keywords.length} keywords</>}
              {as.targeting.topics.length > 0 && <> · {as.targeting.topics.join(', ')}</>}
              <ul>{as.ads.map((ad) => { const q = creativeQuality(p.id, s, draft, ad); return <li key={ad.id}>{ad.name} — predicted quality: <b className={q.label === 'Above average' ? 'good' : q.label === 'Below average' ? 'bad' : ''}>{q.label}</b></li>; })}</ul>
            </dd>
          </div>
        ))}
      </dl>
      <p className="muted small">{p.reviewHours} In the simulator, review happens when you advance to the next day.</p>
    </Card>
  );
}

export const SECTIONS: Record<string, (ctx: EdCtx) => ReactNode> = {
  'c.name': CampaignName,
  'c.special': SpecialCategory,
  'c.cbo': CampaignCbo,
  'c.budget': CampaignBudget,
  'c.bidding': CampaignBidding,
  'g.locations': GoogleLocations,
  'as.name': AdSetName,
  'as.goal': AdSetGoal,
  'as.budget': AdSetBudget,
  'as.bidding': AdSetBidding,
  'as.audience': Audience,
  'as.placements': Placements,
  'as.keywords': (ctx) => <Keywords key={`${ctx.draft.adSets[ctx.asIdx].id}`} {...ctx} />,
  'as.topics': Topics,
  'ad.name': AdName,
  'ad.identity': Identity,
  'ad.format': Format,
  'ad.media': Media,
  'ad.text': AdText,
  'ad.destination': Destination,
  'ad.rsa': Rsa,
  review: Review,
};
