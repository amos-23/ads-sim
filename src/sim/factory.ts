import type { Account, Ad, AdSet, Campaign, Creative, PlatformId, Targeting } from '../types';
import type { Scenario } from '../data/scenarios';
import { PLATFORMS, objectiveOf } from '../platforms/config';
import { uid } from './random';

export function defaultTargeting(platform: PlatformId): Targeting {
  return {
    locations: ['US'],
    ageMin: 18,
    ageMax: 65,
    gender: 'all',
    interests: [],
    keywords: [],
    topics: [],
    languages: ['English'],
    placements: platform === 'chatgpt' ? ['answers'] : [],
    autoPlacements: true,
    expansion: platform === 'meta',
  };
}

const CTA_BY_KIND: Record<string, string[]> = {
  sales: ['Shop now', 'Shop'],
  leads: ['Sign up', 'Book a demo'],
  app: ['Download'],
  traffic: ['Learn more', 'Visit site'],
};

export function defaultCreative(platform: PlatformId, s: Scenario, objectiveId?: string): Creative {
  const p = PLATFORMS[platform];
  const kind = objectiveId ? objectiveOf(p, objectiveId).kind : 'traffic';
  const cta = (CTA_BY_KIND[kind] ?? []).find((c) => p.ctas.includes(c)) ?? p.ctas[0];
  return {
    identity: platform === 'x' ? '@' + s.brand.toLowerCase().replace(/[^a-z]/g, '') : s.brand,
    mediaKind: p.mediaKinds[0],
    aspect: p.defaultAspect,
    mediaPreset: 'product-warm',
    overlay: '',
    primaryText: '',
    headlines: platform === 'google' ? ['', '', ''] : [''],
    descriptions: platform === 'google' ? ['', ''] : [''],
    cta,
    url: '',
    displayPath: ['', ''],
  };
}

export function newAd(platform: PlatformId, s: Scenario, objLabel: string, day: number, n = 1, objectiveId?: string): Ad {
  return { id: uid('ad'), name: `New ${objLabel} ${PLATFORMS[platform].levels.ad}${n > 1 ? ' ' + n : ''}`, status: 'in_review', creative: defaultCreative(platform, s, objectiveId), createdDay: day };
}

export function newAdSet(platform: PlatformId, s: Scenario, objectiveId: string, day: number, n = 1): AdSet {
  const p = PLATFORMS[platform];
  const obj = objectiveOf(p, objectiveId);
  return {
    id: uid('as'),
    name: `New ${obj.label} ${p.levels.adset}${n > 1 ? ' ' + n : ''}`,
    status: 'active',
    targeting: defaultTargeting(platform),
    optimizationGoal: obj.goals[0]?.id ?? '',
    budget: Math.max(p.minBudget.adset, Math.round(s.suggestedDailyBudget / 2)),
    bidStrategy: p.bidStrategies[0].id,
    bidAmount: null,
    ads: [newAd(platform, s, obj.label, day, 1, obj.id)],
    createdDay: day,
  };
}

export function newCampaign(platform: PlatformId, s: Scenario, objectiveId: string, day: number, campaignType?: string): Campaign {
  const p = PLATFORMS[platform];
  const obj = objectiveOf(p, objectiveId);
  const c: Campaign = {
    id: uid('c'),
    name: `New ${obj.label} Campaign`,
    status: 'active',
    objective: obj.id,
    campaignType,
    budgetLevel: p.supportsCbo ? 'campaign' : 'campaign',
    budgetType: 'daily',
    budget: Math.max(p.minBudget.campaign, s.suggestedDailyBudget),
    durationDays: 14,
    bidStrategy: p.bidStrategies[0].id,
    bidAmount: null,
    specialCategory: 'none',
    adSets: [newAdSet(platform, s, obj.id, day)],
    createdDay: day,
  };
  if (platform === 'google' && campaignType === 'search') c.adSets[0].targeting.keywords = [];
  return c;
}

export function newAccount(platform: PlatformId, s: Scenario, name?: string): Account {
  return {
    platform,
    scenarioId: s.id,
    accountName: name || s.brand,
    day: 0,
    startDate: new Date().toISOString().slice(0, 10),
    balance: 5000,
    campaigns: [],
    stats: {},
    notices: [{ id: uid('n'), day: 0, kind: 'info', text: s.open ? 'Welcome! Your practice account has $5,000 in simulated credit. Build a campaign for any business you like.' : `Welcome! Your practice account for ${s.brand} has $5,000 in simulated credit.` }],
  };
}

/** Deep copy with fresh ids (used for “Duplicate”). */
export function cloneCampaign(c: Campaign, day: number): Campaign {
  const copy: Campaign = structuredClone(c);
  copy.id = uid('c');
  copy.name = c.name + ' – Copy';
  copy.createdDay = day;
  copy.status = 'paused';
  copy.adSets.forEach((s) => {
    s.id = uid('as');
    s.createdDay = day;
    s.targeting.keywords.forEach((k) => (k.id = uid('kw')));
    s.ads.forEach((a) => {
      a.id = uid('ad');
      a.status = 'in_review';
      a.createdDay = day;
    });
  });
  return copy;
}

export function cloneAdSet(s: AdSet, day: number): AdSet {
  const copy: AdSet = structuredClone(s);
  copy.id = uid('as');
  copy.name = s.name + ' – Copy';
  copy.createdDay = day;
  copy.targeting.keywords.forEach((k) => (k.id = uid('kw')));
  copy.ads.forEach((a) => {
    a.id = uid('ad');
    a.status = 'in_review';
    a.createdDay = day;
  });
  return copy;
}

export function cloneAd(a: Ad, day: number): Ad {
  return { ...structuredClone(a), id: uid('ad'), name: a.name + ' – Copy', status: 'in_review', createdDay: day };
}
