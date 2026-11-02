import type { Ad, AdSet, Campaign, Creative, Keyword, PlatformId, Targeting } from '../types';
import type { Scenario } from '../data/scenarios';
import { locationById, RESTRICTED_TOPICS } from '../data/scenarios';
import { presetById } from '../data/media';
import { PLATFORMS, objectiveOf } from '../platforms/config';
import { clamp } from './random';

export interface Check {
  ok: boolean;
  msg: string;
  weight: number;
}

export interface QualityResult {
  /** 0.4 – 1.35; 1.0 = average. */
  score: number;
  label: 'Below average' | 'Average' | 'Above average';
  checks: Check[];
}

const words = (s: string) => s.toLowerCase().match(/[a-z0-9%$]+/g) ?? [];

export function relevance(text: string, scenario: Scenario): number {
  const t = text.toLowerCase();
  const hits = scenario.relevantTerms.filter((term) => t.includes(term)).length;
  return clamp(hits / 3, 0, 1);
}

const HOOK_RE = /(\?|!|\d|%|free|new|save|off|today|now|only|limited|discover|meet|introducing|finally|how|why)/i;

function allText(c: Creative) {
  return [c.primaryText, ...c.headlines, ...c.descriptions, c.overlay].join(' ');
}

export function isValidUrl(u: string) {
  return /^https:\/\/[a-z0-9-]+(\.[a-z0-9-]+)+(\/\S*)?$/i.test(u.trim());
}

/** Score an ad's creative the way a platform's relevance / quality diagnostics would. */
export function creativeQuality(platform: PlatformId, scenario: Scenario, campaign: Campaign, ad: Ad): QualityResult {
  const c = ad.creative;
  const checks: Check[] = [];
  const add = (ok: boolean, msg: string, weight = 1) => checks.push({ ok, msg, weight });
  const obj = objectiveOf(PLATFORMS[platform], campaign.objective);
  const text = allText(c);
  const preset = presetById(c.mediaPreset);

  add(isValidUrl(c.url), isValidUrl(c.url) ? 'Destination URL is valid (https)' : 'Add a valid https:// destination URL', 2);
  add(relevance(text, scenario) >= 0.34, relevance(text, scenario) >= 0.34 ? 'Copy is relevant to the product' : `Mention what you sell — e.g. “${scenario.relevantTerms.slice(0, 3).join('”, “')}”`, 1.5);
  add(HOOK_RE.test(c.primaryText + ' ' + (c.headlines[0] ?? '')), HOOK_RE.test(c.primaryText + ' ' + (c.headlines[0] ?? '')) ? 'Has a hook (offer, number, question or news)' : 'Open with a hook: an offer, a number, a question or something new', 1);

  const ctaFit: Record<string, string[]> = {
    sales: ['Shop now', 'Order now', 'Get offer', 'Shop', 'Buy now', 'Subscribe'],
    leads: ['Sign up', 'Get quote', 'Apply now', 'Contact us', 'Book now', 'Book a demo', 'Learn more', 'Subscribe', 'Get started'],
    app: ['Download', 'Install now', 'Sign up', 'Get started'],
    traffic: ['Learn more', 'Shop now', 'Visit site', 'Sign up', 'Shop', 'Get started'],
  };
  if (platform !== 'google') {
    const fits = (ctaFit[obj.kind] ?? []).includes(c.cta) || !(obj.kind in ctaFit);
    add(fits, fits ? `CTA “${c.cta}” fits the objective` : `CTA “${c.cta}” doesn’t match a ${obj.label} objective`, 0.7);
  }

  const hashtags = (c.primaryText.match(/#\w+/g) ?? []).length;

  if (platform === 'meta') {
    const len = c.primaryText.length;
    add(len >= 20 && len <= 180, len < 20 ? 'Primary text is too thin — give people a reason to care' : len > 180 ? 'Primary text will be truncated (“…See more”); front-load the message' : 'Primary text length is in the sweet spot', 1);
    add(!!c.headlines[0] && c.headlines[0].length <= 40, c.headlines[0] ? (c.headlines[0].length <= 40 ? 'Headline is short and scannable' : 'Headline is long — keep it under 40 characters') : 'Add a headline', 1);
    add(c.overlay.length <= 40 && preset.style !== 'text', preset.style === 'text' || c.overlay.length > 40 ? 'Image is text-heavy — people scroll past ads that look like posters' : 'Image isn’t overloaded with text', 1);
    const vertical = c.aspect === '9:16' || c.aspect === '4:5';
    add(vertical || c.mediaKind === 'carousel', vertical ? 'Vertical media fills more screen on mobile' : 'Use 4:5 or 9:16 media — square/landscape wastes mobile screen space', 0.6);
  }
  if (platform === 'tiktok') {
    add(c.mediaKind === 'video', c.mediaKind === 'video' ? 'Video ad (TikTok is a video-first platform)' : 'Image ads under-perform on TikTok — use video', 2);
    add(c.aspect === '9:16', c.aspect === '9:16' ? 'Full-screen 9:16 vertical' : 'Use 9:16 vertical — other ratios show black bars', 1.5);
    add(preset.style === 'ugc' || preset.style === 'lifestyle', preset.style === 'ugc' || preset.style === 'lifestyle' ? 'Native, creator-style content' : 'Polished studio ads feel like ads — try UGC/creator-style video', 1.2);
    add(hashtags >= 1 && hashtags <= 3, hashtags === 0 ? 'Add 1–3 relevant hashtags' : hashtags > 3 ? 'Too many hashtags look spammy' : 'Good hashtag usage', 0.5);
    add(c.primaryText.length > 0 && c.primaryText.length <= 100, c.primaryText.length > 100 ? 'Ad text exceeds 100 characters' : c.primaryText ? 'Ad text within limit' : 'Add ad text', 1);
  }
  if (platform === 'x') {
    const len = c.primaryText.length;
    add(len > 0 && len <= 280, len > 280 ? 'Post exceeds 280 characters' : len ? 'Post is within 280 characters' : 'Write your post text', 1.5);
    add(len >= 40 && len <= 200, len < 40 ? 'Post is very short — add context' : len > 200 ? 'Long posts get skimmed; aim for 70–200 characters' : 'Concise post', 0.8);
    add(hashtags <= 2, hashtags <= 2 ? 'Hashtags kept to 0–2' : 'More than 2 hashtags reduces engagement on X', 0.6);
    add(c.mediaKind !== 'none', c.mediaKind !== 'none' ? 'Post includes media' : 'Posts with an image or video get far more engagement', 1);
  }
  if (platform === 'chatgpt') {
    const helpful = !/(!!|\bbest ever\b|\bamazing\b|\bincredible\b|\bbuy now\b)/i.test(text);
    add(helpful, helpful ? 'Helpful, informational tone' : 'Hype-y language feels out of place next to an answer — be factual', 1.4);
    add((c.descriptions[0] ?? '').length >= 40, (c.descriptions[0] ?? '').length >= 40 ? 'Description explains the value' : 'Description is too short — say how you help', 1);
    add(!!c.headlines[0] && c.headlines[0].length <= 50, c.headlines[0] ? 'Title present' : 'Add an ad title', 1);
  }
  if (platform === 'google') {
    const strength = adStrength(c, campaignKeywords(campaign, ad), scenario);
    add(strength.score >= 2, `Ad strength: ${strength.label}`, 2.5);
    strength.tips.forEach((t) => add(false, t, 0));
  }

  const total = checks.reduce((s, ch) => s + ch.weight, 0) || 1;
  const passed = checks.reduce((s, ch) => s + (ch.ok ? ch.weight : 0), 0);
  const ratio = passed / total;
  let score = 0.45 + ratio * 0.9;
  if (!isValidUrl(c.url)) score *= 0.6;
  score = clamp(score, 0.4, 1.35);
  const label = score >= 1.12 ? 'Above average' : score >= 0.85 ? 'Average' : 'Below average';
  return { score, label, checks: checks.filter((ch) => ch.weight > 0 || !ch.ok) };
}

function campaignKeywords(campaign: Campaign, ad: Ad): Keyword[] {
  const as = campaign.adSets.find((s) => s.ads.some((a) => a.id === ad.id));
  return as?.targeting.keywords ?? [];
}

export interface AdStrength {
  score: 0 | 1 | 2 | 3;
  label: 'Poor' | 'Average' | 'Good' | 'Excellent';
  tips: string[];
}

/** Google RSA ad strength. */
export function adStrength(c: Creative, keywords: Keyword[], scenario: Scenario): AdStrength {
  const hs = c.headlines.map((h) => h.trim()).filter(Boolean);
  const ds = c.descriptions.map((d) => d.trim()).filter(Boolean);
  const unique = new Set(hs.map((h) => h.toLowerCase())).size;
  const tips: string[] = [];
  let pts = 0;
  if (hs.length >= 3) pts += 1; else tips.push('Add at least 3 headlines');
  if (unique >= 8) pts += 1; else tips.push(`Add more unique headlines (${unique}/8+)`);
  if (unique >= 12) pts += 0.5;
  if (ds.length >= 2) pts += 0.5; else tips.push('Add at least 2 descriptions');
  if (ds.length >= 4) pts += 0.5; else if (ds.length >= 2) tips.push('Use all 4 descriptions');
  const kwText = keywords.map((k) => k.text.toLowerCase());
  const withKw = hs.filter((h) => kwText.some((k) => k && h.toLowerCase().includes(k))).length;
  if (withKw >= 2) pts += 1; else tips.push('Include popular keywords in your headlines');
  if (relevance(hs.join(' '), scenario) > 0.3) pts += 0.5; else tips.push('Make headlines more relevant to your product');
  if (hs.some((h) => h.length > 30)) tips.push('Headlines must be 30 characters or less');
  if (ds.some((d) => d.length > 90)) tips.push('Descriptions must be 90 characters or less');
  const score = (pts >= 4 ? 3 : pts >= 3 ? 2 : pts >= 1.5 ? 1 : 0) as AdStrength['score'];
  return { score, label: (['Poor', 'Average', 'Good', 'Excellent'] as const)[score], tips };
}

export interface AudienceInfo {
  /** People (or daily conversations for ChatGPT). */
  size: number;
  /** 0.3 – 1.15: how well the audience matches the ideal customer. */
  fit: number;
  definition: 'Specific' | 'Defined' | 'Broad';
  notes: string[];
}

export function audienceInfo(platform: PlatformId, scenario: Scenario, t: Targeting): AudienceInfo {
  const p = PLATFORMS[platform];
  const notes: string[] = [];
  const locs = t.locations.map(locationById).filter(Boolean) as NonNullable<ReturnType<typeof locationById>>[];
  const pop = locs.reduce((s, l) => s + l.pop, 0) * 1e6 * p.bench.reach;
  const ageMin = clamp(t.ageMin, 13, 65);
  const ageMax = clamp(t.ageMax, ageMin, 65);
  const ageFrac = clamp((ageMax - ageMin + 1) / 48, 0.02, 1);
  const genderFrac = t.gender === 'all' ? 1 : 0.5;
  const interestFrac = t.interests.length === 0 ? 1 : clamp(0.05 + 0.04 * t.interests.length, 0.05, 0.5);
  let size = pop * ageFrac * genderFrac * interestFrac;

  // Fit
  const [iMin, iMax] = scenario.idealAge;
  const overlap = Math.max(0, Math.min(ageMax, iMax) - Math.max(ageMin, iMin) + 1);
  const ageFit = overlap / (ageMax - ageMin + 1);
  let fit = 0.55 + 0.35 * ageFit;
  if (overlap === 0) notes.push(`Your age range misses the core buyer (${iMin}–${iMax}).`);
  if (scenario.idealGender !== 'all' && t.gender !== 'all' && t.gender !== scenario.idealGender) {
    fit *= 0.45;
    notes.push('Gender targeting excludes most of the likely buyers.');
  }
  if (t.interests.length) {
    const match = t.interests.filter((i) => scenario.idealInterests.includes(i)).length;
    const r = match / t.interests.length;
    fit *= 0.75 + 0.45 * r;
    if (r < 0.5) notes.push('Several selected interests are unrelated to the product.');
  } else {
    fit *= 0.92;
  }
  if (platform === 'x' && t.keywords.length) {
    const rel = t.keywords.filter((k) => relevance(k.text, scenario) > 0).length / t.keywords.length;
    fit *= 0.9 + 0.25 * rel;
    size *= 0.4;
  }
  if (platform === 'chatgpt') {
    // Size is driven by relevant daily conversations rather than demographics.
    const topics = t.topics.filter((tp) => !RESTRICTED_TOPICS.includes(tp));
    const rel = topics.filter((tp) => scenario.chatTopics.includes(tp)).length;
    size = pop * 0.012 * (topics.length || 0.5) * (t.expansion ? 1.6 : 1) * ageFrac;
    fit = topics.length ? (0.6 + 0.55 * (rel / topics.length)) * (0.75 + 0.25 * ageFit) : 0.55;
    if (topics.length && rel === 0) notes.push('None of the selected topics are conversations your customers have.');
    if (!topics.length) notes.push('Pick conversation topics so your ad shows next to relevant answers.');
  }
  if (t.expansion && platform !== 'chatgpt') {
    // Algorithmic expansion finds buyers beyond your inputs.
    size = Math.max(size, pop * 0.35);
    fit = Math.max(fit, 0.82) * 1.05;
  }
  fit = clamp(fit, 0.3, 1.15);
  if (!locs.length) {
    size = 0;
    notes.push('Add at least one location.');
  }
  const definition = size < 400_000 ? 'Specific' : size > 25_000_000 ? 'Broad' : 'Defined';
  if (size > 0 && size < 150_000) notes.push('Audience is very small — delivery will be limited.');
  return { size: Math.round(size), fit, definition, notes };
}

export interface PolicyResult {
  ok: boolean;
  reasons: string[];
}

const POLICY_RULES: { re: RegExp; reason: string }[] = [
  { re: /\b(guarantee[ds]?|100% (results|guaranteed))\b/i, reason: 'Misleading claims: ads can’t promise guaranteed results.' },
  { re: /\b(cure[sd]?|heals?|miracle|treats? (acne|anxiety|depression|diabetes))\b/i, reason: 'Health claims: ads can’t claim to cure or treat conditions.' },
  { re: /\b(get rich|free money|double your money|risk[- ]free returns?)\b/i, reason: 'Financial scams: unrealistic earnings claims.' },
  { re: /\b(are you|you're|you are) (fat|overweight|depressed|broke|single|diabetic|ugly|in debt)\b/i, reason: 'Personal attributes: ads can’t assert or imply someone’s personal characteristics.' },
  { re: /\b(lose \d+ ?(lbs|pounds|kg) in \d+ days?)\b/i, reason: 'Unrealistic weight-loss claims.' },
  { re: /\b(click here|tap here now)\b.*\b(win|winner|prize)\b/i, reason: 'Clickbait / engagement bait.' },
];

export function policyCheck(platform: PlatformId, campaign: Campaign, adSet: AdSet, ad: Ad): PolicyResult {
  const text = allText(ad.creative);
  const reasons = POLICY_RULES.filter((r) => r.re.test(text)).map((r) => r.reason);
  if (!isValidUrl(ad.creative.url)) reasons.push('Destination not working: the landing page URL is invalid.');
  if (platform === 'chatgpt') {
    const bad = adSet.targeting.topics.filter((t) => RESTRICTED_TOPICS.includes(t));
    if (bad.length) reasons.push(`Restricted context: ads can’t run next to ${bad.join(', ')} conversations.`);
    if (adSet.targeting.ageMin < 18) reasons.push('Ads can’t be shown to users under 18.');
  }
  if (platform === 'tiktok' && ad.creative.primaryText.length > 100) reasons.push('Ad text exceeds 100 characters.');
  if (platform === 'x' && ad.creative.primaryText.length > 280) reasons.push('Post text exceeds 280 characters.');
  if (platform === 'meta' && campaign.specialCategory !== 'none' && (adSet.targeting.ageMin > 18 || adSet.targeting.ageMax < 65 || adSet.targeting.gender !== 'all')) {
    reasons.push('Special ad category: age and gender targeting can’t be narrowed for this category.');
  }
  return { ok: reasons.length === 0, reasons };
}

/** Google keyword quality score (1–10) and its components. */
export function keywordQuality(kw: Keyword, ad: Ad | undefined, scenario: Scenario) {
  const kwRel = relevance(kw.text, scenario);
  const headlines = ad?.creative.headlines.join(' ').toLowerCase() ?? '';
  const inAd = kw.text.toLowerCase().split(/\s+/).filter((w) => w.length > 2 && headlines.includes(w)).length / Math.max(1, kw.text.split(/\s+/).filter((w) => w.length > 2).length);
  const adRel = clamp(0.3 + 0.7 * inAd, 0, 1) * (0.5 + 0.5 * Math.min(1, kwRel * 2));
  const expCtr = ad ? clamp(adStrength(ad.creative, [kw], scenario).score / 3, 0.2, 1) : 0.2;
  const landing = ad && isValidUrl(ad.creative.url) ? clamp(0.5 + kwRel, 0, 1) : 0.1;
  const qs = clamp(Math.round(1 + 3 * adRel + 3 * expCtr + 3 * landing), 1, 10);
  const lvl = (x: number) => (x > 0.75 ? 'Above average' : x > 0.45 ? 'Average' : 'Below average');
  return { qs, adRelevance: lvl(adRel), expectedCtr: lvl(expCtr), landingPage: lvl(landing), relevance: kwRel };
}

export { words };
