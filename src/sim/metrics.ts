import type { Account, Ad, AdSet, Campaign, DayStat, ObjectiveKind, PlatformId, Status } from '../types';
import { PLATFORMS, bidStrategyOf, objectiveOf } from '../platforms/config';
import { adIds, sumStats } from './engine';

export const fmtMoney = (n: number, digits = 2) => '$' + n.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });
export const fmtInt = (n: number) => Math.round(n).toLocaleString('en-US');
export const fmtPct = (n: number) => (isFinite(n) ? (n * 100).toFixed(2) + '%' : '—');
export const fmtCompact = (n: number) => Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(n);

export function resultsFor(kind: ObjectiveKind, st: DayStat): number {
  switch (kind) {
    case 'awareness': return st.reach;
    case 'traffic': return st.clicks;
    case 'engagement': return st.engagements;
    case 'views': return st.videoViews;
    default: return st.conversions;
  }
}

export function dateFor(acc: Account, day: number) {
  const d = new Date(acc.startDate + 'T12:00:00');
  d.setDate(d.getDate() + day);
  return d;
}

export const fmtDate = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

export type Level = 'campaign' | 'adset' | 'ad';
export type Entity = Campaign | AdSet | Ad;

export interface Row {
  level: Level;
  entity: Entity;
  campaign: Campaign;
  adSet?: AdSet;
  stat: DayStat;
  lastDay: DayStat;
  kind: ObjectiveKind;
}

export function buildRow(acc: Account, level: Level, campaign: Campaign, entity: Entity, adSet?: AdSet, range?: [number, number]): Row {
  const ids = level === 'ad' ? [entity.id] : adIds(entity as Campaign | AdSet);
  const [from, to] = range ?? [0, Infinity];
  const kind = objectiveOf(PLATFORMS[acc.platform], campaign.objective).kind;
  return { level, entity, campaign, adSet, stat: sumStats(acc, ids, from, to), lastDay: sumStats(acc, ids, acc.day - 1, acc.day - 1), kind };
}

export interface Delivery {
  label: string;
  tone: 'green' | 'grey' | 'amber' | 'red' | 'blue';
  sub?: string;
}

function effectiveStatus(row: Row): Status {
  const { campaign, adSet, entity, level } = row;
  if (campaign.status !== 'active') return campaign.status;
  if (level === 'campaign') {
    const ads = campaign.adSets.filter((s) => s.status === 'active').flatMap((s) => s.ads);
    if (ads.some((a) => a.status === 'active')) return 'active';
    if (ads.some((a) => a.status === 'in_review')) return 'in_review';
    if (ads.length && ads.every((a) => a.status === 'rejected')) return 'rejected';
    return 'paused';
  }
  if (level === 'adset') {
    const s = entity as AdSet;
    if (s.status !== 'active') return s.status;
    if (s.ads.some((a) => a.status === 'active')) return 'active';
    if (s.ads.some((a) => a.status === 'in_review')) return 'in_review';
    if (s.ads.length && s.ads.every((a) => a.status === 'rejected')) return 'rejected';
    return 'paused';
  }
  if (adSet && adSet.status !== 'active') return 'paused';
  return (entity as Ad).status;
}

export function delivery(acc: Account, row: Row): Delivery {
  const p = acc.platform;
  const st = effectiveStatus(row);
  const set = row.level === 'adset' ? (row.entity as AdSet) : row.adSet;
  const age = set ? acc.day - set.createdDay : acc.day - row.campaign.createdDay;
  const convKind = row.kind === 'sales' || row.kind === 'leads' || row.kind === 'app';
  const learning = convKind && age <= 5 && row.stat.conversions < 50 && row.stat.impressions > 0;
  const limited = convKind && age > 7 && row.stat.conversions / Math.max(1, age) * 7 < 50 && row.stat.impressions > 0;
  const notDelivering = st === 'active' && acc.day > 0 && row.lastDay.impressions === 0 && age > 0;
  const budget = row.campaign.budgetLevel === 'adset' && set ? set.budget : row.campaign.budget;
  const budgetLimited = row.campaign.budgetType === 'daily' && row.lastDay.spend >= budget * 0.97;

  const L: Record<PlatformId, Record<string, Delivery>> = {
    meta: {
      active: { label: 'Active', tone: 'green' }, paused: { label: 'Off', tone: 'grey' }, in_review: { label: 'In review', tone: 'blue' },
      rejected: { label: 'Rejected', tone: 'red' }, completed: { label: 'Completed', tone: 'grey' }, learning: { label: 'Learning', tone: 'blue' },
      limited: { label: 'Learning limited', tone: 'amber' }, nd: { label: 'Not delivering', tone: 'amber' },
    },
    tiktok: {
      active: { label: 'Delivering', tone: 'green' }, paused: { label: 'Inactive', tone: 'grey' }, in_review: { label: 'In review', tone: 'blue' },
      rejected: { label: 'Not approved', tone: 'red' }, completed: { label: 'Completed', tone: 'grey' }, learning: { label: 'Learning', tone: 'blue' },
      limited: { label: 'Limited delivery', tone: 'amber' }, nd: { label: 'Not delivering', tone: 'amber' },
    },
    google: {
      active: { label: 'Eligible', tone: 'green' }, paused: { label: 'Paused', tone: 'grey' }, in_review: { label: 'Under review', tone: 'blue' },
      rejected: { label: 'Disapproved', tone: 'red' }, completed: { label: 'Ended', tone: 'grey' }, learning: { label: 'Eligible (Learning)', tone: 'blue' },
      limited: { label: 'Eligible (Limited)', tone: 'amber' }, nd: { label: 'Not eligible', tone: 'amber' }, budget: { label: 'Limited by budget', tone: 'amber' },
    },
    x: {
      active: { label: 'Running', tone: 'green' }, paused: { label: 'Paused', tone: 'grey' }, in_review: { label: 'Pending review', tone: 'blue' },
      rejected: { label: 'Rejected', tone: 'red' }, completed: { label: 'Completed', tone: 'grey' }, learning: { label: 'Running', tone: 'green' },
      limited: { label: 'Running', tone: 'green' }, nd: { label: 'Not serving', tone: 'amber' },
    },
    chatgpt: {
      active: { label: 'Active', tone: 'green' }, paused: { label: 'Paused', tone: 'grey' }, in_review: { label: 'In review', tone: 'blue' },
      rejected: { label: 'Rejected', tone: 'red' }, completed: { label: 'Completed', tone: 'grey' }, learning: { label: 'Active · Learning', tone: 'blue' },
      limited: { label: 'Active', tone: 'green' }, nd: { label: 'Not serving', tone: 'amber' },
    },
  };
  const map = L[p];
  if (st !== 'active') return map[st];
  if (acc.balance <= 0) return { ...map.nd, sub: 'No balance' };
  if (notDelivering) return { ...map.nd, sub: 'Check bid, audience or placements' };
  if (p === 'google' && budgetLimited && row.level === 'campaign') return map.budget;
  if (learning && row.level !== 'ad') return map.learning;
  if (limited && row.level !== 'ad') return map.limited;
  if (acc.day === 0 || row.stat.impressions === 0) return { ...map.active, sub: p === 'meta' ? 'Scheduled' : undefined };
  return map.active;
}

export interface ColumnDef {
  id: string;
  label: string;
  align?: 'right' | 'left';
  value: (row: Row, acc: Account) => string;
  total?: (rows: Row[], acc: Account) => string;
}

const resultLabel = (row: Row, acc: Account) => objectiveOf(PLATFORMS[acc.platform], row.campaign.objective).resultLabel;

function budgetText(row: Row, acc: Account) {
  const c = row.campaign;
  const p = PLATFORMS[acc.platform];
  const per = c.budgetType === 'daily' ? 'Daily' : 'Lifetime';
  if (row.level === 'ad') return '—';
  if (p.supportsCbo && c.budgetLevel === 'adset') {
    if (row.level === 'campaign') return acc.platform === 'meta' ? 'Using ad set budget' : 'Ad group budget';
    return `${fmtMoney((row.entity as AdSet).budget)} Daily`;
  }
  if (row.level === 'adset') return acc.platform === 'meta' ? 'Using campaign budget' : '—';
  return `${fmtMoney(c.budget)} ${per}`;
}

const sumRows = (rows: Row[]) => {
  const t = { impressions: 0, reach: 0, clicks: 0, conversions: 0, spend: 0, revenue: 0, videoViews: 0, engagements: 0, results: 0 };
  for (const r of rows) {
    for (const k of Object.keys(t) as (keyof typeof t)[]) if (k !== 'results') t[k] += r.stat[k as keyof DayStat] as number;
    t.results += resultsFor(r.kind, r.stat);
  }
  return t;
};

const ratio = (a: number, b: number, f: (n: number) => string) => (b > 0 ? f(a / b) : '—');

export const COLUMNS: Record<string, ColumnDef> = {
  delivery: { id: 'delivery', label: 'Delivery', align: 'left', value: (r, a) => delivery(a, r).label },
  status: { id: 'status', label: 'Status', align: 'left', value: (r, a) => delivery(a, r).label },
  type: { id: 'type', label: 'Campaign type', align: 'left', value: (r) => ({ search: 'Search', pmax: 'Performance Max', display: 'Display', video: 'Video', demandgen: 'Demand Gen', app: 'App' } as Record<string, string>)[r.campaign.campaignType ?? 'search'] ?? 'Search' },
  bidStrategy: { id: 'bidStrategy', label: 'Bid strategy', align: 'left', value: (r, a) => { const p = PLATFORMS[a.platform]; const holder = p.bidLevel === 'campaign' ? r.campaign : r.level === 'campaign' ? r.campaign.adSets[0] : r.adSet ?? (r.entity as AdSet); return r.level === 'ad' ? '—' : bidStrategyOf(p, holder?.bidStrategy ?? '').label; } },
  budget: { id: 'budget', label: 'Budget', value: budgetText },
  results: { id: 'results', label: 'Results', value: (r) => fmtInt(resultsFor(r.kind, r.stat)), total: (rows) => (new Set(rows.map((r) => r.kind)).size === 1 ? fmtInt(sumRows(rows).results) : '—') },
  resultRate: { id: 'resultRate', label: 'Result rate', value: (r) => ratio(resultsFor(r.kind, r.stat), r.stat.impressions, fmtPct), total: (rows) => { const t = sumRows(rows); return ratio(t.results, t.impressions, fmtPct); } },
  reach: { id: 'reach', label: 'Reach', value: (r) => fmtInt(r.stat.reach), total: (rows) => fmtInt(sumRows(rows).reach) },
  impressions: { id: 'impressions', label: 'Impressions', value: (r) => fmtInt(r.stat.impressions), total: (rows) => fmtInt(sumRows(rows).impressions) },
  frequency: { id: 'frequency', label: 'Frequency', value: (r) => ratio(r.stat.impressions, r.stat.reach, (n) => n.toFixed(2)), total: (rows) => { const t = sumRows(rows); return ratio(t.impressions, t.reach, (n) => n.toFixed(2)); } },
  cpr: { id: 'cpr', label: 'Cost per result', value: (r) => ratio(r.stat.spend, resultsFor(r.kind, r.stat), (n) => fmtMoney(r.kind === 'awareness' ? n * 1000 : n)) + (r.kind === 'awareness' && resultsFor(r.kind, r.stat) ? ' /1K' : ''), total: (rows) => { const t = sumRows(rows); return new Set(rows.map((r) => r.kind)).size === 1 && rows[0]?.kind !== 'awareness' ? ratio(t.spend, t.results, (n) => fmtMoney(n)) : '—'; } },
  spend: { id: 'spend', label: 'Amount spent', value: (r) => fmtMoney(r.stat.spend), total: (rows) => fmtMoney(sumRows(rows).spend) },
  clicks: { id: 'clicks', label: 'Clicks', value: (r) => fmtInt(r.stat.clicks), total: (rows) => fmtInt(sumRows(rows).clicks) },
  ctr: { id: 'ctr', label: 'CTR', value: (r) => ratio(r.stat.clicks, r.stat.impressions, fmtPct), total: (rows) => { const t = sumRows(rows); return ratio(t.clicks, t.impressions, fmtPct); } },
  cpc: { id: 'cpc', label: 'CPC', value: (r) => ratio(r.stat.spend, r.stat.clicks, (n) => fmtMoney(n)), total: (rows) => { const t = sumRows(rows); return ratio(t.spend, t.clicks, (n) => fmtMoney(n)); } },
  cpm: { id: 'cpm', label: 'CPM', value: (r) => ratio(r.stat.spend * 1000, r.stat.impressions, (n) => fmtMoney(n)), total: (rows) => { const t = sumRows(rows); return ratio(t.spend * 1000, t.impressions, (n) => fmtMoney(n)); } },
  conversions: { id: 'conversions', label: 'Conversions', value: (r) => fmtInt(r.stat.conversions), total: (rows) => fmtInt(sumRows(rows).conversions) },
  cpa: { id: 'cpa', label: 'Cost per conversion', value: (r) => ratio(r.stat.spend, r.stat.conversions, (n) => fmtMoney(n)), total: (rows) => { const t = sumRows(rows); return ratio(t.spend, t.conversions, (n) => fmtMoney(n)); } },
  convValue: { id: 'convValue', label: 'Conv. value', value: (r) => fmtMoney(r.stat.revenue), total: (rows) => fmtMoney(sumRows(rows).revenue) },
  roas: { id: 'roas', label: 'ROAS', value: (r) => ratio(r.stat.revenue, r.stat.spend, (n) => n.toFixed(2)), total: (rows) => { const t = sumRows(rows); return ratio(t.revenue, t.spend, (n) => n.toFixed(2)); } },
  videoViews: { id: 'videoViews', label: 'Video views', value: (r) => fmtInt(r.stat.videoViews), total: (rows) => fmtInt(sumRows(rows).videoViews) },
  engagements: { id: 'engagements', label: 'Engagements', value: (r) => fmtInt(r.stat.engagements), total: (rows) => fmtInt(sumRows(rows).engagements) },
};

/** Platform-specific column names. */
export const COLUMN_LABELS: Partial<Record<PlatformId, Record<string, string>>> = {
  tiktok: { spend: 'Cost', cpa: 'Cost per conversion', results: 'Results', videoViews: 'Video views' },
  google: { spend: 'Cost', impressions: 'Impr.', cpc: 'Avg. CPC', cpa: 'Cost / conv.', convValue: 'Conv. value', roas: 'Conv. value / cost' },
  x: { spend: 'Spend', cpr: 'Cost per result', engagements: 'Engagements', clicks: 'Link clicks' },
  chatgpt: { spend: 'Spend', cpa: 'Cost / conversion' },
};

export const columnLabel = (p: PlatformId, id: string) => COLUMN_LABELS[p]?.[id] ?? COLUMNS[id].label;
export { resultLabel };
