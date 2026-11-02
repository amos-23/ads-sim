import { useMemo, useState } from 'react';
import type { Account, Ad, AdSet, Campaign, PlatformId } from '../types';
import { PLATFORMS } from '../platforms/config';
import { scenarioById } from '../data/scenarios';
import { useStore } from '../state/store';
import { COLUMNS, buildRow, columnLabel, dateFor, delivery, fmtInt, fmtMoney, fmtPct, resultsFor, type Level, type Row } from '../sim/metrics';
import { adIds, sumStats } from '../sim/engine';
import { keywordQuality } from '../sim/quality';
import { cloneAd, cloneAdSet, cloneCampaign } from '../sim/factory';
import { Dot, Toggle } from './ui';
import { LineChart } from './Chart';

export type Focus = { level: 'campaign' | 'adset' | 'ad'; asIdx: number; adIdx: number };

interface Props {
  account: Account;
  onCreate: () => void;
  onEdit: (campaignId: string, focus: Focus) => void;
}

type Range = 'lifetime' | '7d' | 'yesterday';

const METRICS: Record<string, { label: string; get: (s: ReturnType<typeof sumStats>) => number; fmt: (n: number) => string }> = {
  spend: { label: 'Amount spent', get: (s) => s.spend, fmt: (n) => fmtMoney(n) },
  impressions: { label: 'Impressions', get: (s) => s.impressions, fmt: fmtInt },
  clicks: { label: 'Clicks', get: (s) => s.clicks, fmt: fmtInt },
  conversions: { label: 'Conversions', get: (s) => s.conversions, fmt: fmtInt },
  ctr: { label: 'CTR', get: (s) => (s.impressions ? s.clicks / s.impressions : 0), fmt: fmtPct },
  cpa: { label: 'Cost per conversion', get: (s) => (s.conversions ? s.spend / s.conversions : 0), fmt: (n) => fmtMoney(n) },
  cpc: { label: 'CPC', get: (s) => (s.clicks ? s.spend / s.clicks : 0), fmt: (n) => fmtMoney(n) },
  roas: { label: 'ROAS', get: (s) => (s.spend ? s.revenue / s.spend : 0), fmt: (n) => n.toFixed(2) },
};

export function Overview({ account, compact }: { account: Account; compact?: boolean }) {
  const p = PLATFORMS[account.platform];
  const [m1, setM1] = useState(account.platform === 'google' ? 'clicks' : 'spend');
  const [m2, setM2] = useState('conversions');
  const ids = account.campaigns.flatMap((c) => adIds(c));
  const days = Array.from({ length: account.day }, (_, i) => i).slice(-30);
  const labels = days.map((d) => dateFor(account, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
  const total = sumStats(account, ids);
  const kpis = ['spend', 'impressions', 'clicks', 'ctr', 'conversions', 'cpa'];
  const colors: Record<PlatformId, [string, string]> = { meta: ['#0866ff', '#f7b928'], tiktok: ['#fe2c55', '#25f4ee'], google: ['#1a73e8', '#d93025'], x: ['#1d9bf0', '#00ba7c'], chatgpt: ['#10a37f', '#7c3aed'] };
  return (
    <div className={`overview ov-${p.id} ${compact ? 'compact' : ''}`} style={{ '--chart1': colors[p.id][0], '--chart2': colors[p.id][1] } as React.CSSProperties}>
      <div className="kpis">
        {kpis.map((k) => (
          <button key={k} className={`kpi ${m1 === k ? 'k1' : m2 === k ? 'k2' : ''}`} onClick={() => (m1 === k ? null : m2 === k ? setM2(m1) : setM2(k))} onDoubleClick={() => setM1(k)}>
            <span>{account.platform === 'tiktok' && k === 'spend' ? 'Total cost' : account.platform === 'google' && k === 'spend' ? 'Cost' : METRICS[k].label}</span>
            <b>{METRICS[k].fmt(METRICS[k].get(total))}</b>
          </button>
        ))}
      </div>
      <div className="ov-chart-h">
        <select className="input small" value={m1} onChange={(e) => setM1(e.target.value)}>{Object.entries(METRICS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select>
        <span className="muted small">vs</span>
        <select className="input small" value={m2} onChange={(e) => setM2(e.target.value)}>{Object.entries(METRICS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select>
      </div>
      <LineChart
        labels={labels}
        height={compact ? 140 : 200}
        format={(n) => String(n)}
        series={[
          { label: METRICS[m1].label, color: colors[p.id][0], fmt: METRICS[m1].fmt, values: days.map((d) => METRICS[m1].get(sumStats(account, ids, d, d))) },
          { label: METRICS[m2].label, color: colors[p.id][1], fmt: METRICS[m2].fmt, values: days.map((d) => METRICS[m2].get(sumStats(account, ids, d, d))) },
        ]}
      />
    </div>
  );
}

export function Manager({ account, onCreate, onEdit }: Props) {
  const store = useStore();
  const p = PLATFORMS[account.platform];
  const s = scenarioById(account.scenarioId);
  const [level, setLevel] = useState<Level | 'keyword'>('campaign');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [range, setRange] = useState<Range>('lifetime');
  const [q, setQ] = useState('');
  const [showChart, setShowChart] = useState(account.platform !== 'meta');
  const r: [number, number] = range === 'lifetime' ? [0, Infinity] : range === '7d' ? [account.day - 7, account.day - 1] : [account.day - 1, account.day - 1];

  const selCampaigns = account.campaigns.filter((c) => selected.has(c.id));
  const selAdSets = account.campaigns.flatMap((c) => c.adSets).filter((x) => selected.has(x.id));

  const rows: Row[] = useMemo(() => {
    const camps = account.campaigns;
    if (level === 'campaign') return camps.map((c) => buildRow(account, 'campaign', c, c, undefined, r));
    const scopeC = selCampaigns.length ? selCampaigns : camps;
    if (level === 'adset' || level === 'keyword') return scopeC.flatMap((c) => c.adSets.map((as) => buildRow(account, 'adset', c, as, as, r)));
    const sets = selAdSets.length ? selAdSets : scopeC.flatMap((c) => c.adSets);
    return scopeC.flatMap((c) => c.adSets.filter((as) => sets.includes(as)).flatMap((as) => as.ads.map((ad) => buildRow(account, 'ad', c, ad, as, r))));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account, level, selected, range]);

  const visible = rows.filter((row) => row.entity.name.toLowerCase().includes(q.toLowerCase()));
  const levelSel = visible.filter((row) => selected.has(row.entity.id));
  const toggleSel = (id: string) => setSelected((cur) => { const n = new Set(cur); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const isOn = (row: Row) => (row.entity as Campaign | AdSet | Ad).status === 'active' || (row.entity as Ad).status === 'in_review';
  const setOn = (row: Row, on: boolean) => store.setStatus(account.platform, [row.entity.id], on ? 'active' : 'paused');

  const focusFor = (row: Row): Focus => {
    const asIdx = row.adSet ? row.campaign.adSets.indexOf(row.adSet) : 0;
    if (row.level === 'campaign') return { level: 'campaign', asIdx: 0, adIdx: 0 };
    if (row.level === 'adset') return { level: 'adset', asIdx, adIdx: 0 };
    return { level: 'ad', asIdx, adIdx: row.adSet!.ads.indexOf(row.entity as Ad) };
  };

  const duplicate = () => {
    const ids = new Set(levelSel.map((x) => x.entity.id));
    store.update(account.platform, (a) => ({
      ...a,
      campaigns: level === 'campaign'
        ? [...a.campaigns.filter((c) => ids.has(c.id)).map((c) => cloneCampaign(c, a.day)), ...a.campaigns]
        : a.campaigns.map((c) => ({
          ...c,
          adSets: level === 'adset'
            ? c.adSets.flatMap((as) => (ids.has(as.id) ? [as, { ...cloneAdSet(as, a.day), status: 'paused' as const }] : [as]))
            : c.adSets.map((as) => ({ ...as, ads: as.ads.flatMap((ad) => (ids.has(ad.id) ? [ad, cloneAd(ad, a.day)] : [ad])) })),
        })),
    }));
  };
  const remove = () => {
    if (!levelSel.length) return;
    if (!confirm(`Delete ${levelSel.length} item(s)? This can’t be undone.`)) return;
    store.remove(account.platform, levelSel.map((x) => x.entity.id));
    setSelected(new Set());
  };

  const cols = p.columns;
  const tabs: [Level | 'keyword', string][] = [['campaign', p.levels.campaigns], ['adset', p.levels.adsets], ['ad', p.levels.ads]];
  if (p.id === 'google') tabs.push(['keyword', 'Keywords']);
  if (p.id === 'chatgpt') tabs.splice(1, 1);

  const createBtn = <button className="btn primary create" onClick={onCreate}>{p.id === 'google' ? <><span className="plus">+</span> {p.createLabel}</> : <>{p.id === 'meta' ? '+ ' : p.id === 'tiktok' ? '+ ' : ''}{p.createLabel}</>}</button>;
  const latest = account.notices.find((n) => n.day >= account.day - 1 && n.kind !== 'info');

  return (
    <div className={`manager mgr-${p.id}`}>
      <div className="mgr-head">
        <h1>{p.id === 'tiktok' ? 'Manage' : p.id === 'google' ? 'Campaigns' : p.id === 'x' ? 'Campaigns' : p.id === 'chatgpt' ? 'Campaigns' : 'Campaigns'}</h1>
        <div className="spacer" />
        <select className="input small range" value={range} onChange={(e) => setRange(e.target.value as Range)} aria-label="Date range">
          <option value="lifetime">Lifetime{account.day ? `: ${dateFor(account, 0).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${dateFor(account, Math.max(0, account.day - 1)).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : ''}</option>
          <option value="7d">Last 7 days</option>
          <option value="yesterday">Yesterday</option>
        </select>
      </div>

      {latest && <div className={`banner banner-${latest.kind}`}>{latest.kind === 'error' ? '⛔' : latest.kind === 'warn' ? '⚠️' : '✅'} {latest.text}</div>}

      {p.id !== 'meta' && showChart && account.campaigns.length > 0 && <Overview account={account} compact />}

      <div className="mgr-tabs">
        {tabs.map(([id, label]) => {
          const count = id === 'campaign' ? selCampaigns.length : id === 'adset' ? selAdSets.length : 0;
          return (
            <button key={id} className={`mgr-tab ${level === id ? 'on' : ''}`} onClick={() => setLevel(id)}>
              <span className="tab-ico">{id === 'campaign' ? '📁' : id === 'adset' ? '▦' : id === 'keyword' ? '🔑' : '▭'}</span>
              {label}
              {count > 0 && <span className="tab-sel">{count} selected <i onClick={(e) => { e.stopPropagation(); setSelected((cur) => { const n = new Set(cur); (id === 'campaign' ? selCampaigns : selAdSets).forEach((x) => n.delete(x.id)); return n; }); }}>×</i></span>}
              {count === 0 && id !== 'campaign' && (selCampaigns.length > 0) && <span className="tab-for">for {selCampaigns.length} {p.levels.campaign.toLowerCase()}</span>}
            </button>
          );
        })}
      </div>

      <div className="mgr-toolbar">
        {createBtn}
        <button className="btn tool" disabled={!levelSel.length || level === 'keyword'} onClick={duplicate}>⧉ Duplicate</button>
        <button className="btn tool" disabled={levelSel.length !== 1 || level === 'keyword'} onClick={() => onEdit(levelSel[0].campaign.id, focusFor(levelSel[0]))}>✎ Edit</button>
        <button className="btn tool" disabled={!levelSel.length || level === 'keyword'} onClick={remove}>🗑 Delete</button>
        {p.id === 'meta' && <button className="btn tool" onClick={() => setShowChart((v) => !v)}>📈 {showChart ? 'Hide charts' : 'View charts'}</button>}
        <div className="spacer" />
        <input className="input small search" placeholder={p.id === 'google' ? 'Filter' : 'Search by name'} value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {p.id === 'meta' && showChart && account.campaigns.length > 0 && <Overview account={account} compact />}

      {level === 'keyword' ? (
        <KeywordTable account={account} range={r} />
      ) : (
        <div className="table-wrap">
          <table className="grid-table">
            <thead>
              <tr>
                <th className="c-check"><input type="checkbox" aria-label="Select all" checked={visible.length > 0 && visible.every((x) => selected.has(x.entity.id))} onChange={(e) => setSelected((cur) => { const n = new Set(cur); visible.forEach((x) => (e.target.checked ? n.add(x.entity.id) : n.delete(x.entity.id))); return n; })} /></th>
                <th className="c-toggle">{p.id === 'meta' ? 'Off / On' : p.id === 'google' ? '' : 'On/Off'}</th>
                <th className="c-name">{level === 'campaign' ? p.levels.campaign : level === 'adset' ? p.levels.adset : p.levels.ad}{p.id === 'meta' ? '' : ' name'}</th>
                {cols.map((c) => <th key={c} className={COLUMNS[c].align === 'left' ? 'l' : ''}>{columnLabel(p.id, c)}</th>)}
              </tr>
            </thead>
            <tbody>
              {visible.length === 0 && (
                <tr><td colSpan={cols.length + 3} className="empty">
                  {account.campaigns.length === 0
                    ? <div className="empty-state"><div className="empty-art">{s.emoji}</div><b>You don’t have any {p.levels.campaigns.toLowerCase()} yet</b><p className="muted">Create your first campaign to start reaching people for {s.open ? 'your business' : s.brand.replace(/\.$/, '')}.</p>{createBtn}</div>
                    : 'No results match your filters.'}
                </td></tr>
              )}
              {visible.map((row) => {
                const d = delivery(account, row);
                const ent = row.entity as Campaign;
                return (
                  <tr key={row.entity.id} className={selected.has(row.entity.id) ? 'sel' : ''}>
                    <td className="c-check"><input type="checkbox" aria-label={`Select ${row.entity.name}`} checked={selected.has(row.entity.id)} onChange={() => toggleSel(row.entity.id)} /></td>
                    <td className="c-toggle"><Toggle on={isOn(row)} label={`Toggle ${row.entity.name}`} disabled={ent.status === 'completed' || (row.level === 'ad' && ['rejected', 'in_review'].includes((row.entity as Ad).status))} onChange={(v) => setOn(row, v)} /></td>
                    <td className="c-name">
                      <button className="name-link" onClick={() => onEdit(row.campaign.id, focusFor(row))}>{row.entity.name}</button>
                      <div className="row-actions">
                        <button onClick={() => onEdit(row.campaign.id, focusFor(row))}>✎ Edit</button>
                        <button onClick={() => { setSelected(new Set([row.entity.id])); if (row.level === 'campaign') setLevel('adset'); else if (row.level === 'adset') setLevel('ad'); }}>{row.level === 'ad' ? '' : `→ ${row.level === 'campaign' ? p.levels.adsets : p.levels.ads}`}</button>
                      </div>
                      {row.level === 'ad' && (row.entity as Ad).status === 'rejected' && <div className="reject-note">⛔ {(row.entity as Ad).reviewNote}</div>}
                    </td>
                    {cols.map((c) => (
                      <td key={c} className={COLUMNS[c].align === 'left' ? 'l' : ''}>
                        {c === 'delivery' || c === 'status'
                          ? <span className="delivery"><span className="dl"><Dot tone={d.tone} />{d.label}</span>{d.sub && <small>{d.sub}</small>}</span>
                          : <>{COLUMNS[c].value(row, account)}{c === 'results' && row.level !== 'ad' && <small className="sub">{resultLabelFor(account, row)}</small>}</>}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
            {visible.length > 0 && (
              <tfoot>
                <tr>
                  <td /><td />
                  <td className="c-name"><b>Results from {visible.length} {visible.length === 1 ? (level === 'campaign' ? p.levels.campaign : level === 'adset' ? p.levels.adset : p.levels.ad).toLowerCase() : (level === 'campaign' ? p.levels.campaigns : level === 'adset' ? p.levels.adsets : p.levels.ads).toLowerCase()}</b><small className="sub">{range === 'lifetime' ? 'Lifetime' : range === '7d' ? 'Last 7 days' : 'Yesterday'}</small></td>
                  {cols.map((c) => <td key={c} className={COLUMNS[c].align === 'left' ? 'l' : ''}>{COLUMNS[c].total ? COLUMNS[c].total!(visible, account) : ''}</td>)}
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}
    </div>
  );
}

function resultLabelFor(acc: Account, row: Row) {
  return PLATFORMS[acc.platform].objectives.find((o) => o.id === row.campaign.objective)?.resultLabel ?? '';
}

function KeywordTable({ account, range }: { account: Account; range: [number, number] }) {
  const s = scenarioById(account.scenarioId);
  const rows = account.campaigns.flatMap((c) => c.adSets.flatMap((as) => as.targeting.keywords.map((k) => ({ c, as, k, st: sumStats(account, [k.id], range[0], range[1]) }))));
  if (!rows.length) return <div className="empty-state"><b>No keywords</b><p className="muted">Add keywords to a Search campaign’s ad group.</p></div>;
  return (
    <div className="table-wrap">
      <table className="grid-table">
        <thead><tr><th className="c-name">Keyword</th><th className="l">Match type</th><th className="l">Campaign</th><th className="l">Ad group</th><th>Quality Score</th><th>Clicks</th><th>Impr.</th><th>CTR</th><th>Avg. CPC</th><th>Cost</th><th>Conversions</th><th>Cost / conv.</th></tr></thead>
        <tbody>
          {rows.map(({ c, as, k, st }) => {
            const qs = keywordQuality(k, as.ads[0], s);
            return (
              <tr key={k.id}>
                <td className="c-name">{k.match === 'exact' ? `[${k.text}]` : k.match === 'phrase' ? `"${k.text}"` : k.text}</td>
                <td className="l">{k.match[0].toUpperCase() + k.match.slice(1)} match</td>
                <td className="l">{c.name}</td>
                <td className="l">{as.name}</td>
                <td title={`Expected CTR: ${qs.expectedCtr}\nAd relevance: ${qs.adRelevance}\nLanding page: ${qs.landingPage}`}><b className={qs.qs >= 7 ? 'good' : qs.qs >= 5 ? '' : 'bad'}>{qs.qs}/10</b></td>
                <td>{fmtInt(st.clicks)}</td>
                <td>{fmtInt(st.impressions)}</td>
                <td>{st.impressions ? fmtPct(st.clicks / st.impressions) : '—'}</td>
                <td>{st.clicks ? fmtMoney(st.spend / st.clicks) : '—'}</td>
                <td>{fmtMoney(st.spend)}</td>
                <td>{fmtInt(st.conversions)}</td>
                <td>{st.conversions ? fmtMoney(st.spend / st.conversions) : '—'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="muted small" style={{ padding: '8px 12px' }}>Hover a Quality Score to see its components: expected CTR, ad relevance and landing page experience.</p>
    </div>
  );
}

export { resultsFor };
