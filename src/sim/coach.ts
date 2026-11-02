import type { Account } from '../types';
import { scenarioById } from '../data/scenarios';
import { PLATFORMS, bidStrategyOf, objectiveOf } from '../platforms/config';
import { adIds, goalFit, sumStats } from './engine';
import { adStrength, audienceInfo, creativeQuality } from './quality';
import { fmtMoney, fmtPct } from './metrics';

export interface Insight {
  severity: 'good' | 'tip' | 'warn' | 'bad';
  title: string;
  body: string;
  where?: string;
}

/** Turn the raw numbers into coaching feedback, like a senior media buyer looking over your shoulder. */
export function coach(acc: Account): Insight[] {
  const s = scenarioById(acc.scenarioId);
  const p = PLATFORMS[acc.platform];
  const out: Insight[] = [];
  if (!acc.campaigns.length) {
    out.push({ severity: 'tip', title: 'Start with your first campaign', body: `Click “${p.createLabel}”. Your brief: get ${s.goalLabel.toLowerCase()} for ${s.brand} at or below ${fmtMoney(s.targetCpa)} each. Pick the objective that matches that outcome.` });
    return out;
  }
  if (acc.day === 0) out.push({ severity: 'tip', title: 'Run the clock', body: 'Use the simulation bar to advance time. Ads go through review on the first day, then begin delivering.' });

  const bench = p.bench;
  for (const c of acc.campaigns) {
    const obj = objectiveOf(p, c.objective);
    const where = c.name;
    const fit = goalFit(obj.kind, s);
    if (fit < 0.6) out.push({ severity: 'bad', where, title: 'Objective doesn’t match the business goal', body: `${s.brand} needs ${s.goalLabel.toLowerCase()}, but this campaign uses “${obj.label}”. The algorithm optimises for what you ask for — choose a ${s.goal === 'sales' ? 'Sales / Conversions' : 'Leads'} objective.` });
    if (['awareness', 'views', 'engagement'].includes(obj.kind)) out.push({ severity: 'tip', where, title: `${obj.label} campaigns won’t optimise for ${s.goalLabel.toLowerCase()}`, body: 'Upper-funnel objectives buy cheap impressions from people unlikely to convert. Great for awareness, but judge them on reach/CPM, not CPA.' });

    const st = sumStats(acc, adIds(c));
    const recent = sumStats(acc, adIds(c), acc.day - 3, acc.day - 1);
    for (const set of c.adSets) {
      const aud = audienceInfo(acc.platform, s, set.targeting);
      aud.notes.forEach((n) => out.push({ severity: 'warn', where: `${c.name} › ${set.name}`, title: 'Audience', body: n }));
      if (set.targeting.interests.length > 6) out.push({ severity: 'tip', where: set.name, title: 'Too many interests', body: 'Stacking many interests rarely helps. Pick 2–5 that describe your buyer, or go broad and let the algorithm find them.' });
      const holder = p.bidLevel === 'campaign' ? c : set;
      const strat = bidStrategyOf(p, holder.bidStrategy);
      const setSpend = sumStats(acc, adIds(set), acc.day - 3, acc.day - 1).spend;
      const budget = c.budgetLevel === 'adset' && p.supportsCbo ? set.budget : c.budget;
      if (strat.amount && holder.bidAmount && acc.day > 2 && setSpend < budget * 3 * 0.5) {
        out.push({ severity: 'warn', where: set.name, title: `Under-delivering: ${strat.label} is too restrictive`, body: `You’ve spent ${fmtMoney(setSpend)} of ~${fmtMoney(budget * 3)} available in the last 3 days. Loosen the ${strat.amountLabel?.toLowerCase() ?? 'bid'} or switch to an automatic strategy.` });
      }
      for (const ad of set.ads) {
        if (ad.status === 'rejected') out.push({ severity: 'bad', where: ad.name, title: 'Ad rejected', body: (ad.reviewNote ?? '') + ' Edit the ad to fix it — it will be reviewed again.' });
        const q = creativeQuality(acc.platform, s, c, ad);
        if (q.label === 'Below average') {
          const fails = q.checks.filter((ch) => !ch.ok).slice(0, 3).map((ch) => '• ' + ch.msg).join('\n');
          out.push({ severity: 'warn', where: ad.name, title: 'Creative quality is below average', body: fails });
        }
        if (acc.platform === 'google' && (c.campaignType ?? 'search') === 'search') {
          const str = adStrength(ad.creative, set.targeting.keywords, s);
          if (str.score < 2) out.push({ severity: 'warn', where: ad.name, title: `Ad strength: ${str.label}`, body: str.tips.slice(0, 3).join('. ') + '.' });
        }
      }
      if (acc.platform === 'google' && (c.campaignType ?? 'search') === 'search') {
        if (!set.targeting.keywords.length) out.push({ severity: 'bad', where: set.name, title: 'No keywords', body: 'Search ads only show when someone searches one of your keywords. Add 5–20 tightly themed keywords.' });
        if (set.targeting.keywords.length && set.targeting.keywords.every((k) => k.match === 'broad') && c.bidStrategy === 'manual_cpc') out.push({ severity: 'tip', where: set.name, title: 'Broad match + manual CPC', body: 'Broad match without Smart Bidding pulls in loosely related searches. Use phrase/exact match, or pair broad with Maximize conversions.' });
      }
    }

    const age = acc.day - c.createdDay;
    if (['sales', 'leads', 'app'].includes(obj.kind) && age > 7 && st.conversions > 0 && (st.conversions / age) * 7 < 50 && ['meta', 'tiktok', 'google'].includes(acc.platform)) {
      out.push({ severity: 'tip', where, title: acc.platform === 'meta' ? 'Learning limited' : 'Not enough conversions to exit learning', body: `The algorithm wants ~50 conversions per week per ${p.levels.adset.toLowerCase()} to stabilise; you’re getting about ${Math.round((st.conversions / age) * 7)}. Consolidate ad sets, raise the budget, or optimise for a more frequent event.` });
    }
    if (st.impressions > 0) {
      const ctr = recent.clicks / Math.max(1, recent.impressions);
      const benchCtr = acc.platform === 'google' && (c.campaignType ?? 'search') === 'search' ? 0.04 : bench.ctr;
      if (recent.impressions > 2000 && ctr < benchCtr * 0.7) out.push({ severity: 'warn', where, title: `Low CTR (${fmtPct(ctr)})`, body: `The ${p.name} benchmark is around ${fmtPct(benchCtr)}. Test new hooks, stronger visuals and an offer.` });
      else if (recent.impressions > 2000 && ctr > benchCtr * 1.3) out.push({ severity: 'good', where, title: `Strong CTR (${fmtPct(ctr)})`, body: 'Your creative is resonating. Consider increasing budget gradually (≈20% every few days) to avoid resetting learning.' });
      const freq = st.impressions / Math.max(1, st.reach);
      if (freq > 3.5) out.push({ severity: 'warn', where, title: `High frequency (${freq.toFixed(1)})`, body: 'The same people are seeing your ad repeatedly; CTR drops as fatigue sets in. Broaden the audience or refresh creative.' });
      if (['sales', 'leads', 'app'].includes(obj.kind) && st.spend > s.targetCpa * 3) {
        const cpa = st.spend / Math.max(1, st.conversions);
        if (st.conversions === 0) out.push({ severity: 'bad', where, title: 'No conversions yet', body: `You’ve spent ${fmtMoney(st.spend)} — over 3× your target CPA — with no results. Check targeting, creative relevance and your landing page URL.` });
        else if (cpa > s.targetCpa * 1.25) out.push({ severity: 'warn', where, title: `CPA ${fmtMoney(cpa)} is above target (${fmtMoney(s.targetCpa)})`, body: 'Cut the weakest ads/ad sets, tighten the audience toward your ideal buyer, and test new creative.' });
        else if (cpa > s.targetCpa) out.push({ severity: 'tip', where, title: `CPA ${fmtMoney(cpa)} is close to target (${fmtMoney(s.targetCpa)})`, body: 'You’re within 25% of target. Pause the weakest ad, test one new creative angle, and give the algorithm a few more days before making big changes.' });
        else if (cpa <= s.targetCpa) out.push({ severity: 'good', where, title: `On target: CPA ${fmtMoney(cpa)}`, body: `You’re beating the ${fmtMoney(s.targetCpa)} target. ROAS ${(st.revenue / Math.max(1, st.spend)).toFixed(2)}. Scale carefully.` });
      }
    }
  }
  const order = { bad: 0, warn: 1, tip: 2, good: 3 };
  return out.sort((a, b) => order[a.severity] - order[b.severity]);
}
