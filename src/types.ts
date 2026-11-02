export type PlatformId = 'meta' | 'tiktok' | 'google' | 'x' | 'chatgpt';

export type Status = 'active' | 'paused' | 'in_review' | 'rejected' | 'completed';

/** What an objective actually optimises for inside the simulation engine. */
export type ObjectiveKind = 'awareness' | 'traffic' | 'engagement' | 'views' | 'leads' | 'sales' | 'app';

export type MatchType = 'broad' | 'phrase' | 'exact';

export interface Keyword {
  id: string;
  text: string;
  match: MatchType;
}

export interface Targeting {
  locations: string[];
  ageMin: number;
  ageMax: number;
  gender: 'all' | 'male' | 'female';
  interests: string[];
  /** Search keywords (Google) or targeting keywords (X). */
  keywords: Keyword[];
  /** Conversation topics (ChatGPT). */
  topics: string[];
  languages: string[];
  /** Empty array + autoPlacements=true means automatic / Advantage+ placements. */
  placements: string[];
  autoPlacements: boolean;
  /** Meta "Advantage+ audience" / TikTok "Automatic targeting" / X "Optimized targeting". */
  expansion: boolean;
}

export type MediaKind = 'image' | 'video' | 'carousel' | 'none';
export type Aspect = '1:1' | '4:5' | '9:16' | '16:9' | '1.91:1';

export interface Creative {
  /** Brand identity shown on the ad (Facebook Page, TikTok display name, X handle…). */
  identity: string;
  mediaKind: MediaKind;
  aspect: Aspect;
  mediaPreset: string;
  /** Optional uploaded image, stored as a downscaled data URL. */
  mediaUpload?: string;
  /** Text overlaid on the image / video. */
  overlay: string;
  primaryText: string;
  headlines: string[];
  descriptions: string[];
  cta: string;
  url: string;
  /** Google display path segments (example.com/path1/path2). */
  displayPath: string[];
}

export interface Ad {
  id: string;
  name: string;
  status: Status;
  creative: Creative;
  reviewNote?: string;
  createdDay: number;
}

export interface AdSet {
  id: string;
  name: string;
  status: Status;
  targeting: Targeting;
  optimizationGoal: string;
  /** Only used when budget lives at ad-set level. */
  budget: number;
  bidStrategy: string;
  bidAmount: number | null;
  ads: Ad[];
  createdDay: number;
}

export interface Campaign {
  id: string;
  name: string;
  status: Status;
  objective: string;
  /** Google campaign type: search | pmax | display | video. */
  campaignType?: string;
  /** Meta Advantage campaign budget / TikTok CBO. */
  budgetLevel: 'campaign' | 'adset';
  budgetType: 'daily' | 'lifetime';
  budget: number;
  /** For lifetime budgets. */
  durationDays: number;
  bidStrategy: string;
  bidAmount: number | null;
  specialCategory: string;
  adSets: AdSet[];
  createdDay: number;
}

export interface DayStat {
  day: number;
  impressions: number;
  /** New unique people reached this day. Sum across days = cumulative reach. */
  reach: number;
  clicks: number;
  conversions: number;
  spend: number;
  revenue: number;
  videoViews: number;
  engagements: number;
}

export interface Notice {
  id: string;
  day: number;
  kind: 'info' | 'warn' | 'error' | 'success';
  text: string;
}

export interface Account {
  platform: PlatformId;
  scenarioId: string;
  accountName: string;
  /** Number of days simulated so far. */
  day: number;
  startDate: string;
  balance: number;
  campaigns: Campaign[];
  /** Keyed by ad id or keyword id. */
  stats: Record<string, DayStat[]>;
  notices: Notice[];
}
