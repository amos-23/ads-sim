import type { Account, Ad, AdSet, Campaign, DayStat, Keyword, Notice, ObjectiveKind, PlatformId } from '../types';
import { scenarioById, locationById, type Scenario } from '../data/scenarios';
import { PLATFORMS, bidStrategyOf, objectiveOf } from '../platforms/config';
import { audienceInfo, creativeQuality, keywordQuality, policyCheck, relevance } from './quality';
import { clamp, rng, stochasticRound, uid } from './random';

const MODES: Record<ObjectiveKind, { cpm: number; ctr: number; cvr: number; view: number; eng: number }> = {
  awareness: { cpm: 0.55, ctr: 0.6, cvr: 0.3, view: 1, eng: 1 },
  traffic: { cpm: 0.9, ctr: 1.3, cvr: 0.5, view: 1, eng: 1 },
  engagement: { cpm: 0.7, ctr: 0.8, cvr: 0.35, view: 1.2, eng: 3 },
  views: { cpm: 0.6, ctr: 0.6, cvr: 0.3, view: 2.2, eng: 1.3 },
  leads: { cpm: 1.15, ctr: 1, cvr: 1, view: 1, eng: 1 },
  sales: { cpm: 1.25, ctr: 1, cvr: 1, view: 1, eng: 1 },
  app: { cpm: 1.0, ctr: 1.1, cvr: 0.9, view: 1, eng: 1 },
};

/** How well the campaign objective matches what the business actually needs. */
export function goalFit(kind: ObjectiveKind, s: Scenario): number {
  if (kind === 'app') return s.hasApp ? 1 : 0.15;
  if (s.goal === 'sales') return kind === 'leads' ? 0.45 : 1;
  return kind === 'sales' ? 0.9 : 1;
}

export const emptyStat = (day: number): DayStat => ({ day, impressions: 0, reach: 0, clicks: 0, conversions: 0, spend: 0, revenue: 0, videoViews: 0, engagements: 0 });

export function sumStats(acc: Account, ids: string[], from = 0, to = Infinity): DayStat {
  const out = emptyStat(-1);
  for (const id of ids) {
    for (const s of acc.stats[id] ?? []) {
      if (s.day < from || s.day > to) continue;
      out.impressions += s.impressions;
      out.reach += s.reach;
      out.clicks += s.clicks;
      out.conversions += s.conversions;
      out.spend += s.spend;
      out.revenue += s.revenue;
      out.videoViews += s.videoViews;
      out.engagements += s.engagements;
    }
  }
  return out;
}

export const adIds = (c: Campaign | AdSet): string[] =>
  'adSets' in c ? c.adSets.flatMap((s) => s.ads.map((a) => a.id)) : c.ads.map((a) => a.id);

function locationMix(locIds: string[]) {
  const locs = locIds.map(locationById).filter(Boolean) as NonNullable<ReturnType<typeof locationById>>[];
  const pop = locs.reduce((s, l) => s + l.pop, 0);
  const costIdx = pop ? locs.reduce((s, l) => s + l.pop * l.costIdx, 0) / pop : 1;
  return { pop, costIdx };
}

interface AdSetResult {
  perAd: Record<string, DayStat>;
  perKeyword: Record<string, DayStat>;
  spend: number;
}

function bidThrottle(amountType: string | undefined, amount: number | null, expected: { cpm: number; cpc: number; cpa: number; roas: number }) {
  if (!amountType || !amount || amount <= 0) return 1;
  let ratio = 1;
  if (amountType === 'cpa') ratio = amount / expected.cpa;
  if (amountType === 'cpc') ratio = amount / expected.cpc;
  if (amountType === 'cpm') ratio = amount / expected.cpm;
  if (amountType === 'roas') ratio = expected.roas / amount;
  return ratio >= 1 ? 1 : clamp(Math.pow(ratio, 3), 0.01, 1);
}

function simulateFeed(platform: PlatformId, acc: Account, s: Scenario, camp: Campaign, set: AdSet, ads: Ad[], budget: number, day: number): AdSetResult {
  const p = PLATFORMS[platform];
  const obj = objectiveOf(p, camp.objective);
  const mode = MODES[obj.kind];
  const r = rng(`${set.id}:${day}`);
  const aud = audienceInfo(platform, s, set.targeting);
  const perAd: Record<string, DayStat> = {};
  if (aud.size <= 0 || budget <= 0) return { perAd, perKeyword: {}, spend: 0 };

  const prior = sumStats(acc, adIds(set));
  const age = day - set.createdDay;
  const convKind = obj.kind === 'sales' || obj.kind === 'leads' || obj.kind === 'app';
  const learning = convKind && age < 5 && prior.conversions < 50;
  const vol = learning ? 1.7 : 1;
  const noise = () => 1 + (r() - 0.5) * 0.28 * vol;

  const qs = ads.map((a) => creativeQuality(platform, s, camp, a).score);
  const qAvg = qs.reduce((x, y) => x + y, 0) / qs.length;
  const loc = locationMix(set.targeting.locations);

  // Placements
  let placementMult = 0.9;
  if (p.placements.length && !set.targeting.autoPlacements) {
    const sel = set.targeting.placements.length;
    if (sel === 0) return { perAd, perKeyword: {}, spend: 0 };
    placementMult = 1 + 0.3 * (1 - sel / p.placements.length);
  }
  const narrowPremium = aud.size < 200_000 ? 1.5 : aud.size < 1_000_000 ? 1.2 : 1;

  let cpm = p.bench.cpm * s.cpmMult * mode.cpm * loc.costIdx * placementMult * narrowPremium * (1 / (0.55 + 0.45 * qAvg)) * noise();
  if (camp.specialCategory && camp.specialCategory !== 'none') cpm *= 1.1;
  const baseCtr = p.bench.ctr * mode.ctr * s.ctrMult * aud.fit;
  const fitG = goalFit(obj.kind, s);
  const marketCvr = 0.55 + 0.45 * loc.costIdx;
  const baseCvr = p.bench.cvr * mode.cvr * s.cvrMult * Math.pow(aud.fit, 1.2) * fitG * marketCvr * (learning ? 0.8 : 1);

  // Bid strategy throttling
  const bidHolder = p.bidLevel === 'campaign' ? camp : set;
  const strat = bidStrategyOf(p, bidHolder.bidStrategy);
  const expCtr = baseCtr * qAvg;
  const expCpc = cpm / (1000 * expCtr);
  const expCpa = expCpc / Math.max(1e-6, baseCvr);
  const throttle = bidThrottle(strat.amount, bidHolder.bidAmount, { cpm, cpc: expCpc, cpa: expCpa, roas: s.value / expCpa });
  if (throttle < 1) cpm *= 0.9;

  // Delivery & reach
  const saturation = clamp(prior.reach / aud.size, 0, 0.98);
  const maxImpr = aud.size * 0.3 * (1 - 0.6 * saturation);
  const pacing = 0.9 + r() * 0.15;
  let spend = Math.min(budget * pacing * throttle, (maxImpr * cpm) / 1000);
  const impressions = (spend / cpm) * 1000;
  const freqToday = 1.1 + 2.5 * saturation;
  const newReach = Math.min(aud.size - prior.reach, (impressions / freqToday) * (1 - saturation));
  const totalFreq = (prior.impressions + impressions) / Math.max(1, prior.reach + newReach);
  const fatigue = totalFreq > 2.5 ? 1 / (1 + 0.22 * (totalFreq - 2.5)) : 1;

  const weights = qs.map((q) => Math.pow(q, 4));
  const wSum = weights.reduce((x, y) => x + y, 0);
  spend = 0;
  ads.forEach((ad, i) => {
    const share = weights[i] / wSum;
    const impr = Math.round(impressions * share);
    const q = qs[i];
    const ctr = baseCtr * q * fatigue * noise();
    const clicks = stochasticRound(impr * ctr, r);
    const cvr = baseCvr * (0.75 + 0.25 * q) * noise();
    const conversions = stochasticRound(clicks * cvr, r);
    const isVideo = ad.creative.mediaKind === 'video';
    const st: DayStat = {
      day,
      impressions: impr,
      reach: Math.round(newReach * share),
      clicks,
      conversions,
      spend: +(impr * cpm / 1000).toFixed(2),
      revenue: +(conversions * s.value * (s.goal === 'sales' ? 0.85 + r() * 0.3 : 1)).toFixed(2),
      videoViews: isVideo ? Math.round(impr * (0.12 + 0.15 * q) * mode.view * fatigue) : 0,
      engagements: Math.round(clicks + impr * 0.008 * q * mode.eng * fatigue),
    };
    spend += st.spend;
    perAd[ad.id] = st;
  });
  return { perAd, perKeyword: {}, spend };
}

const MATCH = { broad: { vol: 2.6, ctr: 0.75, cvr: 0.75 }, phrase: { vol: 1, ctr: 1, cvr: 1 }, exact: { vol: 0.45, ctr: 1.2, cvr: 1.15 } };
const LOW_INTENT = ['free', 'template', 'diy', 'jobs', 'job', 'salary', 'cheap', 'meaning', 'definition', 'how to make', 'near me'];

export function lookupKeyword(text: string, s: Scenario) {
  const t = text.toLowerCase().trim();
  const toks = t.split(/\s+/).filter(Boolean);
  let best = { volume: 25, cpc: 0.8, overlap: 0 };
  for (const k of s.keywords) {
    const kt = k.text.split(' ');
    const ov = kt.filter((w) => toks.includes(w)).length / Math.max(kt.length, toks.length);
    if (ov > best.overlap) {
      const vol = k.text === t ? k.volume : k.volume * ov * (toks.length > kt.length ? 0.3 : 0.5);
      best = { volume: vol, cpc: k.cpc, overlap: ov };
    }
  }
  let rel = Math.max(relevance(t, s), best.overlap * 0.85);
  const exact = s.keywords.find((k) => k.text === t);
  if (exact && exact.text.split(' ').length === 1) rel *= 0.55; // one-word generic terms are vague
  const lowIntent = LOW_INTENT.some((w) => t.includes(w));
  if (lowIntent) rel *= 0.35;
  return { volume: Math.max(5, best.volume), cpc: best.cpc, rel: clamp(rel, 0.03, 1), lowIntent };
}

function simulateSearch(acc: Account, s: Scenario, camp: Campaign, set: AdSet, ads: Ad[], budget: number, day: number): AdSetResult {
  const r = rng(`${set.id}:search:${day}`);
  const noise = () => 1 + (r() - 0.5) * 0.25;
  const loc = locationMix(set.targeting.locations);
  const popFactor = loc.pop / 230;
  const obj = objectiveOf(PLATFORMS.google, camp.objective);
  const fitG = goalFit(obj.kind, s);
  const age = day - camp.createdDay;
  const learning = (camp.bidStrategy === 'max_conversions' || camp.bidStrategy === 'max_conv_value') && age < 7;
  const qs = ads.map((a) => creativeQuality('google', s, camp, a).score);
  const best = ads[qs.indexOf(Math.max(...qs))];
  const kwOut: Record<string, DayStat> = {};
  let total = { impressions: 0, clicks: 0, conv: 0, spend: 0 };

  const rows = set.targeting.keywords.filter((k) => k.text.trim()).map((kw) => {
    const base = lookupKeyword(kw.text, s);
    const m = MATCH[kw.match];
    const q = keywordQuality(kw, best, s);
    const market = base.cpc * loc.costIdx;
    const strat = camp.bidStrategy;
    let bid = market * 1.6;
    if (strat === 'manual_cpc') bid = camp.bidAmount ?? market;
    if (strat === 'max_clicks' && camp.bidAmount) bid = Math.min(camp.bidAmount, market * 1.6);
    if (strat === 'max_conversions') bid = market * 1.8;
    if (strat === 'target_is') bid = market * 2.3;
    const expCvr = 0.06 * base.rel;
    if (strat === 'max_conversions' && camp.bidAmount) bid = Math.min(bid, camp.bidAmount * expCvr * 1.3);
    const compRank = market * 6;
    const adRank = bid * q.qs;
    const is = clamp((adRank / compRank) * 0.55, 0.02, 0.9);
    const pos = clamp(adRank / compRank, 0.4, 1.4);
    const vol = base.volume * m.vol * popFactor * noise();
    const impressions = vol * is;
    const ctr = 0.05 * (0.35 + 0.65 * base.rel) * pos * (0.6 + 0.4 * (q.qs / 10)) * s.ctrMult * m.ctr * noise();
    const cpc = Math.min(bid, ((compRank * 0.8) / q.qs) * noise() + 0.01);
    const clicks = impressions * ctr;
    const cvr = 0.06 * (0.2 + 0.8 * base.rel) * m.cvr * s.cvrMult * fitG * (0.55 + 0.45 * loc.costIdx) * (learning ? 0.85 : 1) * (obj.kind === 'traffic' ? 0.6 : 1) * noise();
    return { kw, impressions, clicks, cpc, cvr };
  });
  const rawSpend = rows.reduce((x, rw) => x + rw.clicks * rw.cpc, 0);
  const scale = rawSpend > budget ? budget / rawSpend : 1;
  for (const rw of rows) {
    const impressions = Math.round(rw.impressions * scale);
    const clicks = stochasticRound(rw.clicks * scale, r);
    const conversions = stochasticRound(clicks * rw.cvr, r);
    const spend = +(clicks * rw.cpc).toFixed(2);
    kwOut[rw.kw.id] = { ...emptyStat(day), impressions, reach: Math.round(impressions * 0.8), clicks, conversions, spend, revenue: +(conversions * s.value).toFixed(2), engagements: clicks };
    total.impressions += impressions;
    total.clicks += clicks;
    total.conv += conversions;
    total.spend += spend;
  }
  // Split across ads (Google rotates towards the best ad).
  const weights = qs.map((q) => Math.pow(q, 3));
  const wSum = weights.reduce((a, b) => a + b, 0);
  const perAd: Record<string, DayStat> = {};
  let accImp = 0, accClk = 0, accConv = 0, accSpend = 0;
  ads.forEach((ad, i) => {
    const last = i === ads.length - 1;
    const sh = weights[i] / wSum;
    const impressions = last ? total.impressions - accImp : Math.round(total.impressions * sh);
    const clicks = last ? total.clicks - accClk : Math.round(total.clicks * sh);
    const conversions = last ? total.conv - accConv : Math.round(total.conv * sh);
    const spend = last ? +(total.spend - accSpend).toFixed(2) : +(total.spend * sh).toFixed(2);
    accImp += impressions; accClk += clicks; accConv += conversions; accSpend += spend;
    perAd[ad.id] = { ...emptyStat(day), impressions, reach: Math.round(impressions * 0.8), clicks, conversions, spend, revenue: +(conversions * s.value).toFixed(2), engagements: clicks };
  });
  void acc;
  return { perAd, perKeyword: kwOut, spend: total.spend };
}

const note = (day: number, kind: Notice['kind'], text: string): Notice => ({ id: uid('n'), day, kind, text });

/** Simulate one day of delivery for the whole account. Pure: returns a new account. */
export function advanceDay(input: Account): Account {
  const acc: Account = structuredClone(input);
  const day = acc.day;
  const s = scenarioById(acc.scenarioId);
  const p = PLATFORMS[acc.platform];
  const notices: Notice[] = [];

  // 1. Ad review
  for (const c of acc.campaigns) for (const set of c.adSets) for (const ad of set.ads) {
    if (ad.status !== 'in_review') continue;
    const res = policyCheck(acc.platform, c, set, ad);
    if (res.ok) {
      ad.status = 'active';
      ad.reviewNote = undefined;
      notices.push(note(day, 'success', `Ad “${ad.name}” was approved and is now eligible to run.`));
    } else {
      ad.status = 'rejected';
      ad.reviewNote = res.reasons.join(' ');
      notices.push(note(day, 'error', `Ad “${ad.name}” was rejected: ${res.reasons[0]}`));
    }
  }

  // 2. Delivery
  let daySpend = 0;
  if (acc.balance > 0) {
    for (const c of acc.campaigns) {
      if (c.status !== 'active') continue;
      const spentSoFar = sumStats(acc, adIds(c)).spend;
      let campBudget = c.budget;
      if (c.budgetType === 'lifetime') {
        const remainingDays = c.durationDays - (day - c.createdDay);
        if (remainingDays <= 0 || spentSoFar >= c.budget - 0.01) {
          c.status = 'completed';
          notices.push(note(day, 'info', `Campaign “${c.name}” has completed its schedule.`));
          continue;
        }
        campBudget = (c.budget - spentSoFar) / remainingDays;
      }
      const eligible = c.adSets.filter((set) => set.status === 'active' && set.ads.some((a) => a.status === 'active'));
      if (!eligible.length) continue;
      const useCampaignBudget = !p.supportsCbo || c.budgetLevel === 'campaign';
      // CBO: give more budget to ad sets that look more efficient.
      const effs = eligible.map((set) => {
        const ads = set.ads.filter((a) => a.status === 'active');
        const q = ads.reduce((m, a) => Math.max(m, creativeQuality(acc.platform, s, c, a).score), 0);
        return Math.pow(audienceInfo(acc.platform, s, set.targeting).fit * q, 3);
      });
      const effSum = effs.reduce((a, b) => a + b, 0) || 1;
      eligible.forEach((set, i) => {
        const ads = set.ads.filter((a) => a.status === 'active');
        const budget = useCampaignBudget ? campBudget * (effs[i] / effSum) : set.budget;
        const isSearch = acc.platform === 'google' && (c.campaignType ?? 'search') === 'search';
        const res = isSearch ? simulateSearch(acc, s, c, set, ads, budget, day) : simulateFeed(acc.platform, acc, s, c, set, ads, budget, day);
        for (const [id, st] of Object.entries(res.perAd)) (acc.stats[id] ??= []).push(st);
        for (const [id, st] of Object.entries(res.perKeyword)) (acc.stats[id] ??= []).push(st);
        daySpend += res.spend;
      });
    }
    acc.balance = +(acc.balance - daySpend).toFixed(2);
    if (acc.balance <= 0) notices.push(note(day, 'error', 'Your prepaid balance has run out. Ads stopped delivering — add funds in Billing.'));
    else if (acc.balance < daySpend * 3) notices.push(note(day, 'warn', 'Your balance is running low (less than 3 days of spend left).'));
  } else if (acc.campaigns.some((c) => c.status === 'active')) {
    notices.push(note(day, 'error', 'Ads aren’t delivering: no remaining balance.'));
  }

  acc.day = day + 1;
  acc.notices = [...notices, ...acc.notices].slice(0, 60);
  return acc;
}

export function advanceDays(acc: Account, n: number): Account {
  let a = acc;
  for (let i = 0; i < n; i++) a = advanceDay(a);
  return a;
}

export type { Keyword };
