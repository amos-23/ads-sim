import { describe, expect, it } from 'vitest';
import { newAccount, newCampaign } from '../factory';
import { advanceDays, sumStats, adIds } from '../engine';
import { scenarioById } from '../../data/scenarios';
import type { Account, PlatformId } from '../../types';
import { uid } from '../random';

const s = scenarioById('brewly');

function setup(p: PlatformId, objective: string, good = true, type?: string): Account {
  const acc = newAccount(p, s);
  const c = newCampaign(p, s, objective, 0, type);
  const ad = c.adSets[0].ads[0];
  ad.creative = {
    ...ad.creative,
    mediaKind: p === 'tiktok' ? 'video' : ad.creative.mediaKind,
    aspect: p === 'tiktok' ? '9:16' : p === 'meta' ? '4:5' : ad.creative.aspect,
    mediaPreset: p === 'tiktok' ? 'ugc' : 'lifestyle',
    primaryText: good ? 'Fresh roasted specialty coffee beans, delivered. Get 30% off your first bag today! #coffee' : 'hello',
    headlines: p === 'google'
      ? ['Coffee Subscription', 'Fresh Roasted Coffee', 'Specialty Coffee Beans', 'Buy Coffee Beans Online', '30% Off First Bag', 'Free Shipping', 'Roasted To Order', 'Skip Or Cancel Anytime', 'Small-Batch Roasters', 'Best Coffee Beans']
      : [good ? '30% off your first bag' : ''],
    descriptions: p === 'google' ? ['Small-batch specialty coffee roasted the day it ships.', 'Flexible subscription. Pause anytime.', 'Single origins and blends.', 'Free shipping over $30.'] : ['Fresh specialty coffee, explained: how our roast helps your cup.'],
    cta: 'Shop now',
    url: good ? 'https://brewly.example/shop' : '',
  };
  if (p === 'google') c.adSets[0].targeting.keywords = [
    { id: uid('kw'), text: 'coffee subscription', match: 'phrase' },
    { id: uid('kw'), text: 'buy coffee beans online', match: 'phrase' },
    { id: uid('kw'), text: 'best coffee beans', match: 'exact' },
  ];
  if (p === 'chatgpt') c.adSets[0].targeting.topics = ['Food & drink', 'Cooking & recipes'];
  c.adSets[0].targeting.interests = ['Coffee', 'Espresso'];
  c.adSets[0].targeting.ageMin = 25; c.adSets[0].targeting.ageMax = 44;
  acc.campaigns = [c];
  return acc;
}

describe('engine', () => {
  for (const [p, o, t] of [['meta', 'sales'], ['tiktok', 'sales'], ['google', 'sales', 'search'], ['google', 'sales', 'display'], ['x', 'conversions'], ['chatgpt', 'conversions']] as [PlatformId, string, string?][]) {
    it(`${p}/${o}${t ? '/' + t : ''} produces plausible numbers`, () => {
      const acc = advanceDays(setup(p, o, true, t), 14);
      const st = sumStats(acc, adIds(acc.campaigns[0]));
      const bad = sumStats(advanceDays(setup(p, o, false, t), 14), adIds(acc.campaigns[0]));
      console.log(p, t ?? '', JSON.stringify({ spend: st.spend.toFixed(0), impr: st.impressions, clicks: st.clicks, ctr: (st.clicks / st.impressions * 100).toFixed(2), conv: st.conversions, cpa: (st.spend / st.conversions).toFixed(2), roas: (st.revenue / st.spend).toFixed(2), badStatus: acc.campaigns[0].adSets[0].ads[0].status, badSpend: bad.spend.toFixed(0) }));
      expect(st.spend).toBeGreaterThan(0);
      expect(st.spend).toBeLessThanOrEqual(50 * 14 * 1.16);
    });
  }
  it('rejects policy-violating ads', () => {
    const acc = setup('meta', 'sales');
    acc.campaigns[0].adSets[0].ads[0].creative.primaryText = 'Guaranteed results or your money back';
    const after = advanceDays(acc, 1);
    expect(after.campaigns[0].adSets[0].ads[0].status).toBe('rejected');
  });
});
