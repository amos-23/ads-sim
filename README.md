# AdsSim — practise running ads without spending money

AdsSim is an ad-buying "flight simulator". You pick an ad platform, pick a practice business, and build campaigns in an interface that looks and works like that platform's real ads tool. Then you fast-forward time and see what your choices lead to.

| Platform | What you practise |
| --- | --- |
| **Meta Ads Manager** | Objective modal (ODAX), campaign → ad set → ad tree editor, Advantage+ campaign budget, Advantage+ audience, placements, Facebook/Instagram feed, Stories and Reels previews, Learning / Learning limited |
| **TikTok Ads Manager** | Grouped objectives, ad groups, $50/$20 minimum budgets, cost and bid caps, 9:16 video, For You feed preview |
| **Google Ads** | Objective → campaign type (Search, PMax, Display, Video, Demand Gen), stepper flow, keyword match types (`kw`, `"kw"`, `[kw]`), Keyword Planner ideas, responsive search ads with **Ad strength**, **Quality Score**, Limited by budget, Keywords tab |
| **X Ads** | Objectives, ad groups, Autobid / Target cost / Max bid, keyword targeting, promoted post with website card preview |
| **ChatGPT Ads** | Contextual targeting by conversation topic, restricted topics (health, politics), 18+ only, sponsored card shown under an answer |

> AdsSim is an independent educational tool. It is not affiliated with Meta, TikTok, Google, X or OpenAI. All numbers are simulated.

## How the simulation works

The `src/sim/` folder holds the engine. It is deterministic: the same set-up on the same day always gives the same numbers.

- **Auction and pacing.** Each day, budget is turned into impressions using a platform-specific CPM. That CPM is adjusted for objective, location cost, audience narrowness, placements and creative quality.
- **Audience.** Locations, age, gender and interests (or topics on ChatGPT) give an estimated size and a *fit* score against the brief's ideal customer. Small audiences under-deliver and saturate.
- **Creative quality.** Per-platform checks: hooks, copy length, CTA–objective fit, vertical video on TikTok, hashtags, 280 characters on X, a factual tone on ChatGPT, RSA ad strength on Google. Quality affects cost, CTR and how delivery is split between ads.
- **Learning phase.** Conversion campaigns are noisier and less efficient until they have about 50 conversions.
- **Fatigue.** As frequency rises, CTR decays.
- **Bidding.** Cost caps, bid caps and ROAS goals throttle delivery when they are set below what the market needs.
- **Google Search.** Keyword volume × match type × impression share, where impression share comes from Ad Rank = bid × Quality Score.
- **Ad review.** Ads are reviewed when you advance a day. Ads with guaranteed results, health cures, personal attributes ("Are you overweight?"), get-rich claims, broken URLs or restricted ChatGPT topics are rejected.
- **Coach.** Compares your results with platform benchmarks and the brief's target CPA, and explains what to change.

## Getting started

```bash
npm install
```

```bash
npm run dev
```

Then open the URL Vite prints (usually http://localhost:5173).

Other scripts:

```bash
npm run build     # type-check and build a static site into dist/
```

```bash
npm test          # engine tests (vitest)
```

The build is fully static (`base: './'`), so `dist/` can be hosted on GitHub Pages, Netlify, Vercel or any file host. Progress is saved in the browser's `localStorage`. To start over, use **Brief → Reset account** in the simulation dock.

## Project layout

```
src/
  platforms/config.ts     objectives, bid strategies, placements, text limits, benchmarks per platform
  platforms/shells.tsx    platform chrome (top bars, side navs)
  platforms/previews.tsx  platform-accurate ad previews
  components/Manager.tsx  campaigns / ad sets / ads table, charts, keywords tab
  components/editor/      campaign editor (tree layout for Meta/TikTok, stepper for Google/X/ChatGPT)
  components/SimBar.tsx   simulation dock, coach, brief, billing
  sim/                    engine, quality & policy scoring, metrics, coach
  data/                   practice briefs (scenarios), locations, interests, media library
```

### Adding a platform or scenario

- **Scenario:** add an entry to `SCENARIOS` in `src/data/scenarios.ts`.
- **Platform:** add a `PlatformDef` in `src/platforms/config.ts`, a shell in `shells.tsx`, a preview in `previews.tsx` and a theme block in `src/styles/platforms.css`.
