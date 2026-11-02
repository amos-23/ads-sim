import type { Campaign } from '../../types';
import type { PlatformDef } from '../../platforms/config';
import { bidStrategyOf } from '../../platforms/config';
import { isValidUrl } from '../../sim/quality';

export interface Issue {
  msg: string;
  asIdx?: number;
  adIdx?: number;
  section: string;
}

export function validate(c: Campaign, p: PlatformDef): Issue[] {
  const out: Issue[] = [];
  if (!c.name.trim()) out.push({ msg: 'Campaign name is required.', section: 'c.name' });
  const campaignBudget = !p.supportsCbo || c.budgetLevel === 'campaign';
  if (campaignBudget && c.budget < p.minBudget.campaign) out.push({ msg: `Campaign budget must be at least $${p.minBudget.campaign}.`, section: p.supportsCbo ? 'c.cbo' : 'c.budget' });
  if (c.budgetType === 'lifetime' && c.durationDays < 1) out.push({ msg: 'Lifetime budgets need an end date.', section: 'c.cbo' });
  if (p.bidLevel === 'campaign') {
    const b = bidStrategyOf(p, c.bidStrategy);
    if (b.amountRequired && !(c.bidAmount && c.bidAmount > 0)) out.push({ msg: `Enter a ${b.amountLabel?.toLowerCase()}.`, section: 'c.bidding' });
  }
  const isSearch = p.id === 'google' && (c.campaignType ?? 'search') === 'search';
  c.adSets.forEach((s, asIdx) => {
    const where = `${p.levels.adset} “${s.name}”`;
    if (!s.name.trim()) out.push({ msg: `${p.levels.adset} name is required.`, asIdx, section: 'as.name' });
    if (!s.targeting.locations.length) out.push({ msg: `${where}: choose at least one location.`, asIdx, section: p.id === 'google' ? 'g.locations' : 'as.audience' });
    if (p.supportsCbo && c.budgetLevel === 'adset' && s.budget < p.minBudget.adset) out.push({ msg: `${where}: budget must be at least $${p.minBudget.adset}.`, asIdx, section: 'as.budget' });
    if (p.bidLevel === 'adset') {
      const b = bidStrategyOf(p, s.bidStrategy);
      if (b.amountRequired && !(s.bidAmount && s.bidAmount > 0)) out.push({ msg: `${where}: enter a ${b.amountLabel?.toLowerCase()}.`, asIdx, section: 'as.bidding' });
    }
    if (p.placements.length && !s.targeting.autoPlacements && !s.targeting.placements.length) out.push({ msg: `${where}: select at least one placement.`, asIdx, section: 'as.placements' });
    if (isSearch && !s.targeting.keywords.length) out.push({ msg: `${where}: add keywords.`, asIdx, section: 'as.keywords' });
    if (p.id === 'chatgpt' && !s.targeting.topics.length) out.push({ msg: 'Choose at least one conversation topic.', asIdx, section: 'as.topics' });
    if (!s.ads.length) out.push({ msg: `${where}: add at least one ad.`, asIdx, section: 'as.name' });
    s.ads.forEach((ad, adIdx) => {
      const aw = `Ad “${ad.name}”`;
      const cr = ad.creative;
      if (!isValidUrl(cr.url)) out.push({ msg: `${aw}: enter a valid website URL (https://…).`, asIdx, adIdx, section: p.id === 'google' ? 'ad.rsa' : 'ad.destination' });
      if (!cr.identity.trim()) out.push({ msg: `${aw}: choose an identity.`, asIdx, adIdx, section: 'ad.identity' });
      for (const f of p.textFields) {
        const val = f.field === 'primaryText' ? cr.primaryText : f.field === 'headline' ? cr.headlines[0] ?? '' : cr.descriptions[0] ?? '';
        if (f.required && !val.trim()) out.push({ msg: `${aw}: ${f.label.toLowerCase()} is required.`, asIdx, adIdx, section: 'ad.text' });
        if (val.length > f.limit) out.push({ msg: `${aw}: ${f.label.toLowerCase()} is over ${f.limit} characters.`, asIdx, adIdx, section: 'ad.text' });
      }
      if (p.id === 'google') {
        const hs = cr.headlines.filter((h) => h.trim());
        const ds = cr.descriptions.filter((d) => d.trim());
        if (hs.length < 3) out.push({ msg: `${aw}: add at least 3 headlines.`, asIdx, adIdx, section: 'ad.rsa' });
        if (ds.length < 2) out.push({ msg: `${aw}: add at least 2 descriptions.`, asIdx, adIdx, section: 'ad.rsa' });
        if (hs.some((h) => h.length > 30)) out.push({ msg: `${aw}: headlines can be at most 30 characters.`, asIdx, adIdx, section: 'ad.rsa' });
        if (ds.some((d) => d.length > 90)) out.push({ msg: `${aw}: descriptions can be at most 90 characters.`, asIdx, adIdx, section: 'ad.rsa' });
      }
    });
  });
  return out;
}
