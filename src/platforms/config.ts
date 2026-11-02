import type { Aspect, Campaign, MediaKind, ObjectiveKind, PlatformId } from '../types';

export interface Option {
  id: string;
  label: string;
  desc?: string;
}

export interface ObjectiveDef {
  id: string;
  label: string;
  desc: string;
  group?: string;
  kind: ObjectiveKind;
  resultLabel: string;
  icon: string;
  goodFor: string[];
  goals: Option[];
}

export interface BidStrategyDef {
  id: string;
  label: string;
  desc: string;
  /** What the optional/required amount represents. */
  amount?: 'cpa' | 'cpc' | 'cpm' | 'roas';
  amountRequired?: boolean;
  amountLabel?: string;
}

export interface TextFieldDef {
  field: 'primaryText' | 'headline' | 'description';
  label: string;
  limit: number;
  recommended?: number;
  multiline?: boolean;
  required?: boolean;
  help: string;
  placeholder: string;
}

export interface StepDef {
  id: string;
  label: string;
  sections: string[];
  /** Which pickers to show above the sections. */
  scope: 'campaign' | 'adset' | 'ad' | 'review';
}

export interface PlatformDef {
  id: PlatformId;
  name: string;
  productName: string;
  tagline: string;
  description: string;
  color: string;
  levels: { campaign: string; adset: string; ad: string; campaigns: string; adsets: string; ads: string };
  objectiveTitle: string;
  objectives: ObjectiveDef[];
  campaignTypes?: (Option & { icon: string; objectives: string[] })[];
  ctas: string[];
  placements: (Option & { group: string })[];
  autoPlacementLabel: string;
  expansionLabel: string;
  bidLevel: 'campaign' | 'adset';
  bidStrategies: BidStrategyDef[];
  mediaKinds: MediaKind[];
  aspects: Aspect[];
  defaultAspect: Aspect;
  supportsCbo: boolean;
  cboLabel: string;
  minBudget: { campaign: number; adset: number };
  textFields: TextFieldDef[];
  bench: { cpm: number; ctr: number; cvr: number; reach: number };
  layout: 'tree' | 'stepper';
  publishLabel: string;
  createLabel: string;
  columns: string[];
  steps?: (c: Campaign) => StepDef[];
  treeSections?: { campaign: string[]; adset: string[]; ad: string[] };
  identityLabel: string;
  identityHelp: string;
  reviewHours: string;
}

const META: PlatformDef = {
  id: 'meta',
  name: 'Meta',
  productName: 'Ads Manager',
  tagline: 'Facebook · Instagram · Messenger · Threads',
  description: 'Build campaigns → ad sets → ads with Advantage+ audiences, placements and the classic Ads Manager table.',
  color: '#0866ff',
  levels: { campaign: 'Campaign', adset: 'Ad set', ad: 'Ad', campaigns: 'Campaigns', adsets: 'Ad sets', ads: 'Ads' },
  objectiveTitle: 'Choose a campaign objective',
  objectives: [
    { id: 'awareness', label: 'Awareness', icon: '📣', kind: 'awareness', resultLabel: 'Reach', desc: 'Show your ads to people who are most likely to remember them.', goodFor: ['Reach', 'Brand awareness', 'Video views', 'Store location awareness'], goals: [{ id: 'reach', label: 'Maximise reach of ads' }, { id: 'impressions', label: 'Maximise number of impressions' }, { id: 'recall', label: 'Maximise ad recall lift' }] },
    { id: 'traffic', label: 'Traffic', icon: '🖱️', kind: 'traffic', resultLabel: 'Link clicks', desc: 'Send people to a destination, such as your website, app, Instagram profile or Facebook event.', goodFor: ['Link clicks', 'Landing page views', 'Instagram profile visits', 'Messenger, Instagram and WhatsApp'], goals: [{ id: 'lpv', label: 'Maximise number of landing page views' }, { id: 'link_clicks', label: 'Maximise number of link clicks' }] },
    { id: 'engagement', label: 'Engagement', icon: '💬', kind: 'engagement', resultLabel: 'Post engagements', desc: 'Get more messages, purchases through messaging, video views, post engagement, Page likes or event responses.', goodFor: ['Messenger, Instagram and WhatsApp', 'Video views', 'Post engagement', 'Conversions'], goals: [{ id: 'post_engagement', label: 'Maximise engagement with a post' }, { id: 'thruplay', label: 'Maximise ThruPlay views' }] },
    { id: 'leads', label: 'Leads', icon: '🧲', kind: 'leads', resultLabel: 'Leads', desc: 'Collect leads for your business or brand.', goodFor: ['Website and instant forms', 'Instant forms', 'Messenger, Instagram and WhatsApp', 'Conversions', 'Calls'], goals: [{ id: 'leads', label: 'Maximise number of leads' }, { id: 'conversion_leads', label: 'Maximise number of conversion leads' }] },
    { id: 'app', label: 'App promotion', icon: '📱', kind: 'app', resultLabel: 'App installs', desc: 'Find new people to install your app and continue using it.', goodFor: ['App installs', 'App events'], goals: [{ id: 'installs', label: 'Maximise number of app installs' }, { id: 'app_events', label: 'Maximise number of app events' }] },
    { id: 'sales', label: 'Sales', icon: '🛍️', kind: 'sales', resultLabel: 'Purchases', desc: 'Find people likely to purchase your product or service.', goodFor: ['Conversions', 'Catalogue sales', 'Messenger, Instagram and WhatsApp', 'Calls'], goals: [{ id: 'conversions', label: 'Maximise number of conversions' }, { id: 'value', label: 'Maximise value of conversions' }] },
  ],
  ctas: ['Shop now', 'Learn more', 'Sign up', 'Subscribe', 'Get offer', 'Order now', 'Book now', 'Contact us', 'Download', 'Apply now', 'Get quote'],
  placements: [
    { id: 'fb_feed', label: 'Facebook Feed', group: 'Feeds' },
    { id: 'ig_feed', label: 'Instagram feed', group: 'Feeds' },
    { id: 'ig_explore', label: 'Instagram Explore', group: 'Feeds' },
    { id: 'fb_marketplace', label: 'Facebook Marketplace', group: 'Feeds' },
    { id: 'threads', label: 'Threads feed', group: 'Feeds' },
    { id: 'ig_stories', label: 'Instagram Stories', group: 'Stories, Status, Reels' },
    { id: 'fb_stories', label: 'Facebook Stories', group: 'Stories, Status, Reels' },
    { id: 'ig_reels', label: 'Instagram Reels', group: 'Stories, Status, Reels' },
    { id: 'fb_reels', label: 'Facebook Reels', group: 'Stories, Status, Reels' },
    { id: 'messenger', label: 'Messenger inbox', group: 'Messages' },
    { id: 'an', label: 'Audience Network native, banner and interstitial', group: 'Apps and sites' },
  ],
  autoPlacementLabel: 'Advantage+ placements (recommended)',
  expansionLabel: 'Advantage+ audience',
  bidLevel: 'adset',
  bidStrategies: [
    { id: 'highest_volume', label: 'Highest volume', desc: 'Get the most results for your budget.' },
    { id: 'cost_cap', label: 'Cost per result goal', desc: 'Aim for a certain cost per result while maximising the volume of results.', amount: 'cpa', amountRequired: true, amountLabel: 'Cost per result goal' },
    { id: 'bid_cap', label: 'Bid cap', desc: 'Set the highest that you want to bid in any auction (per 1,000 impressions here).', amount: 'cpm', amountRequired: true, amountLabel: 'Bid cap' },
    { id: 'roas_goal', label: 'ROAS goal', desc: 'Aim for a certain return on ad spend while maximising the value of results.', amount: 'roas', amountRequired: true, amountLabel: 'ROAS goal' },
  ],
  mediaKinds: ['image', 'video', 'carousel'],
  aspects: ['1:1', '4:5', '9:16', '1.91:1'],
  defaultAspect: '1:1',
  supportsCbo: true,
  cboLabel: 'Advantage+ campaign budget',
  minBudget: { campaign: 1, adset: 1 },
  textFields: [
    { field: 'primaryText', label: 'Primary text', limit: 2200, recommended: 125, multiline: true, required: true, help: 'Text that appears above your ad. Keep it under 125 characters so it isn’t truncated.', placeholder: 'Tell people what your ad is about' },
    { field: 'headline', label: 'Headline', limit: 255, recommended: 40, required: true, help: 'Short, bold text below the image.', placeholder: 'Write a short headline' },
    { field: 'description', label: 'Description', limit: 255, recommended: 30, help: 'Optional. Appears below the headline in some placements.', placeholder: 'Include additional details' },
  ],
  bench: { cpm: 11, ctr: 0.012, cvr: 0.035, reach: 1 },
  layout: 'tree',
  publishLabel: 'Publish',
  createLabel: 'Create',
  columns: ['delivery', 'bidStrategy', 'budget', 'results', 'reach', 'impressions', 'cpr', 'spend', 'frequency', 'ctr', 'cpm', 'roas'],
  treeSections: {
    campaign: ['c.name', 'c.special', 'c.cbo'],
    adset: ['as.name', 'as.goal', 'as.budget', 'as.bidding', 'as.audience', 'as.placements'],
    ad: ['ad.name', 'ad.identity', 'ad.format', 'ad.media', 'ad.text', 'ad.destination'],
  },
  identityLabel: 'Facebook Page',
  identityHelp: 'Your Facebook Page or Instagram account represents your business in ads.',
  reviewHours: 'Most ads are reviewed within 24 hours.',
};

const TIKTOK: PlatformDef = {
  id: 'tiktok',
  name: 'TikTok',
  productName: 'Ads Manager',
  tagline: 'TikTok · Pangle · Lemon8',
  description: 'Full-screen vertical video ads with Smart targeting, ad groups and TikTok’s bidding & optimisation flow.',
  color: '#fe2c55',
  levels: { campaign: 'Campaign', adset: 'Ad group', ad: 'Ad', campaigns: 'Campaigns', adsets: 'Ad groups', ads: 'Ads' },
  objectiveTitle: 'Advertising objective',
  objectives: [
    { id: 'reach', label: 'Reach', group: 'Awareness', icon: '📡', kind: 'awareness', resultLabel: 'Reach', desc: 'Show your ad to the maximum number of people.', goodFor: ['Brand launches'], goals: [{ id: 'reach', label: 'Reach' }] },
    { id: 'traffic', label: 'Traffic', group: 'Consideration', icon: '🔗', kind: 'traffic', resultLabel: 'Clicks', desc: 'Drive more people to your website or app.', goodFor: ['Landing page views'], goals: [{ id: 'click', label: 'Click' }, { id: 'lpv', label: 'Landing page view' }] },
    { id: 'video_views', label: 'Video views', group: 'Consideration', icon: '▶️', kind: 'views', resultLabel: '6-second video views', desc: 'Get more people to watch your video ads.', goodFor: ['Focused view', '6-second views'], goals: [{ id: '6s', label: '6-second views (Focused view)' }, { id: '2s', label: '2-second video views' }] },
    { id: 'community', label: 'Community interaction', group: 'Consideration', icon: '❤️', kind: 'engagement', resultLabel: 'Profile visits', desc: 'Get more followers or profile visits.', goodFor: ['Followers', 'Profile visits'], goals: [{ id: 'follows', label: 'Follows' }, { id: 'profile_views', label: 'Profile visits' }] },
    { id: 'app', label: 'App promotion', group: 'Consideration', icon: '📲', kind: 'app', resultLabel: 'App installs', desc: 'Get more people to install and take action in your app.', goodFor: ['App installs', 'Re-engagement'], goals: [{ id: 'install', label: 'Install' }, { id: 'in_app_event', label: 'In-app event' }] },
    { id: 'leads', label: 'Lead generation', group: 'Consideration', icon: '📝', kind: 'leads', resultLabel: 'Leads', desc: 'Collect leads for your business using instant forms or your website.', goodFor: ['Instant form', 'Website forms'], goals: [{ id: 'leads', label: 'Leads' }] },
    { id: 'sales', label: 'Sales', group: 'Conversion', icon: '🛒', kind: 'sales', resultLabel: 'Conversions', desc: 'Drive valuable actions on your website, app or TikTok Shop.', goodFor: ['Website conversions', 'Catalog sales', 'TikTok Shop'], goals: [{ id: 'complete_payment', label: 'Complete payment' }, { id: 'value', label: 'Value (highest value)' }] },
  ],
  ctas: ['Shop now', 'Learn more', 'Sign up', 'Download', 'Order now', 'Subscribe', 'Contact us', 'Apply now', 'Book now', 'Get quote', 'Watch now'],
  placements: [
    { id: 'tiktok', label: 'TikTok', group: 'Placements', desc: 'In-feed ads on the For You page' },
    { id: 'pangle', label: 'Pangle', group: 'Placements', desc: 'Partner app network' },
    { id: 'gab', label: 'Global App Bundle', group: 'Placements', desc: 'CapCut, Fizzo and others' },
    { id: 'lemon8', label: 'Lemon8', group: 'Placements', desc: 'Lifestyle community app' },
  ],
  autoPlacementLabel: 'Automatic placement',
  expansionLabel: 'Automatic targeting',
  bidLevel: 'adset',
  bidStrategies: [
    { id: 'max_delivery', label: 'Maximum delivery', desc: 'Get the maximum number of results by spending your budget.' },
    { id: 'cost_cap', label: 'Cost cap', desc: 'Keep your average cost per result around your target.', amount: 'cpa', amountRequired: true, amountLabel: 'Cost cap' },
    { id: 'bid_cap', label: 'Bid cap', desc: 'Control the maximum bid per click (CPC).', amount: 'cpc', amountRequired: true, amountLabel: 'Bid (CPC)' },
  ],
  mediaKinds: ['video', 'image', 'carousel'],
  aspects: ['9:16', '1:1', '16:9'],
  defaultAspect: '9:16',
  supportsCbo: true,
  cboLabel: 'Campaign budget optimization',
  minBudget: { campaign: 50, adset: 20 },
  textFields: [
    { field: 'primaryText', label: 'Ad text', limit: 100, recommended: 80, multiline: true, required: true, help: 'Text shown above the identity on your video. 1–100 characters. Emojis and hashtags OK.', placeholder: 'Enter ad text' },
  ],
  bench: { cpm: 8, ctr: 0.01, cvr: 0.026, reach: 0.6 },
  layout: 'tree',
  publishLabel: 'Submit',
  createLabel: 'Create',
  columns: ['status', 'budget', 'spend', 'cpc', 'cpm', 'impressions', 'clicks', 'ctr', 'conversions', 'cpa', 'videoViews', 'results'],
  treeSections: {
    campaign: ['c.name', 'c.cbo'],
    adset: ['as.name', 'as.goal', 'as.placements', 'as.audience', 'as.budget', 'as.bidding'],
    ad: ['ad.name', 'ad.identity', 'ad.format', 'ad.media', 'ad.text', 'ad.destination'],
  },
  identityLabel: 'Identity',
  identityHelp: 'Use a custom identity or your TikTok account. This is the display name on your ad.',
  reviewHours: 'Ads are usually reviewed within 24 hours.',
};

const googleSteps = (c: Campaign): StepDef[] => {
  const isSearch = (c.campaignType ?? 'search') === 'search';
  return [
    { id: 'bidding', label: 'Bidding', scope: 'campaign', sections: ['c.bidding'] },
    { id: 'settings', label: 'Campaign settings', scope: 'campaign', sections: ['c.name', 'g.locations'] },
    isSearch
      ? { id: 'kw', label: 'Keywords and ads', scope: 'adset', sections: ['as.name', 'as.keywords', 'ad.rsa'] }
      : { id: 'aud', label: c.campaignType === 'pmax' ? 'Asset group' : 'Ad groups', scope: 'adset', sections: ['as.name', 'as.audience', 'ad.format', 'ad.media', 'ad.rsa'] },
    { id: 'budget', label: 'Budget', scope: 'campaign', sections: ['c.budget'] },
    { id: 'review', label: 'Review', scope: 'review', sections: ['review'] },
  ];
};

const GOOGLE: PlatformDef = {
  id: 'google',
  name: 'Google Ads',
  productName: 'Google Ads',
  tagline: 'Search · YouTube · Display · Performance Max',
  description: 'Bid on keywords, write responsive search ads, watch Quality Score and impression share — plus Display, YouTube and PMax.',
  color: '#1a73e8',
  levels: { campaign: 'Campaign', adset: 'Ad group', ad: 'Ad', campaigns: 'Campaigns', adsets: 'Ad groups', ads: 'Ads' },
  objectiveTitle: 'What’s your campaign objective?',
  objectives: [
    { id: 'sales', label: 'Sales', icon: '🏷️', kind: 'sales', resultLabel: 'Conversions', desc: 'Drive sales online, in app, by phone or in store', goodFor: [], goals: [{ id: 'purchase', label: 'Purchases' }] },
    { id: 'leads', label: 'Leads', icon: '👥', kind: 'leads', resultLabel: 'Conversions', desc: 'Get leads and other conversions by encouraging customers to take action', goodFor: [], goals: [{ id: 'lead', label: 'Submit lead form' }] },
    { id: 'traffic', label: 'Website traffic', icon: '🖱️', kind: 'traffic', resultLabel: 'Clicks', desc: 'Get the right people to visit your website', goodFor: [], goals: [{ id: 'clicks', label: 'Clicks' }] },
    { id: 'app', label: 'App promotion', icon: '📱', kind: 'app', resultLabel: 'Installs', desc: 'Get more installs, engagement and pre-registration for your app', goodFor: [], goals: [{ id: 'install', label: 'Installs' }] },
    { id: 'awareness', label: 'Awareness and consideration', icon: '📢', kind: 'awareness', resultLabel: 'Impressions', desc: 'Reach a broad audience and build interest in your products or brand', goodFor: [], goals: [{ id: 'reach', label: 'Reach' }] },
  ],
  campaignTypes: [
    { id: 'search', label: 'Search', icon: '🔍', desc: 'Reach customers interested in your product or service with text ads', objectives: ['sales', 'leads', 'traffic'] },
    { id: 'pmax', label: 'Performance Max', icon: '⚡', desc: 'Reach audiences across all of Google with a single campaign', objectives: ['sales', 'leads', 'traffic', 'awareness'] },
    { id: 'display', label: 'Display', icon: '🖼️', desc: 'Reach customers across 3 million sites and apps with engaging creative', objectives: ['sales', 'leads', 'traffic', 'awareness'] },
    { id: 'video', label: 'Video', icon: '🎬', desc: 'Reach viewers on YouTube and get conversions', objectives: ['sales', 'leads', 'traffic', 'awareness'] },
    { id: 'demandgen', label: 'Demand Gen', icon: '✨', desc: 'Run ads on YouTube, Gmail, Discover and more', objectives: ['sales', 'leads', 'traffic', 'awareness'] },
    { id: 'app', label: 'App', icon: '📱', desc: 'Drive app installs across Google’s networks', objectives: ['app'] },
  ],
  ctas: ['Learn more', 'Shop now', 'Sign up', 'Get quote', 'Book now', 'Download', 'Contact us'],
  placements: [],
  autoPlacementLabel: 'All networks',
  expansionLabel: 'Optimized targeting',
  bidLevel: 'campaign',
  bidStrategies: [
    { id: 'max_conversions', label: 'Maximize conversions', desc: 'Get the most conversions for your budget. Optionally set a target cost per action (tCPA).', amount: 'cpa', amountLabel: 'Target CPA (optional)' },
    { id: 'max_conv_value', label: 'Maximize conversion value', desc: 'Get the most conversion value. Optionally set a target ROAS.', amount: 'roas', amountLabel: 'Target ROAS (optional)' },
    { id: 'max_clicks', label: 'Maximize clicks', desc: 'Get as many clicks as possible. Optionally set a maximum CPC bid limit.', amount: 'cpc', amountLabel: 'Maximum CPC bid limit (optional)' },
    { id: 'target_is', label: 'Target impression share', desc: 'Show your ad at the absolute top of the page as often as possible.' },
    { id: 'manual_cpc', label: 'Manual CPC', desc: 'You set the maximum cost per click for your keywords.', amount: 'cpc', amountRequired: true, amountLabel: 'Default max. CPC' },
  ],
  mediaKinds: ['image', 'video'],
  aspects: ['1.91:1', '1:1', '4:5', '16:9'],
  defaultAspect: '1.91:1',
  supportsCbo: false,
  cboLabel: '',
  minBudget: { campaign: 1, adset: 1 },
  textFields: [],
  bench: { cpm: 4, ctr: 0.006, cvr: 0.014, reach: 1.1 },
  layout: 'stepper',
  publishLabel: 'Publish campaign',
  createLabel: 'New campaign',
  columns: ['status', 'type', 'budget', 'clicks', 'impressions', 'ctr', 'cpc', 'spend', 'conversions', 'cpa', 'convValue', 'roas'],
  steps: googleSteps,
  identityLabel: 'Business name',
  identityHelp: 'Shown next to your ads.',
  reviewHours: 'Most ads are reviewed within one business day.',
};

const xSteps = (): StepDef[] => [
  { id: 'campaign', label: 'Campaign details', scope: 'campaign', sections: ['c.name', 'c.budget'] },
  { id: 'adgroup', label: 'Ad group details', scope: 'adset', sections: ['as.name', 'as.goal', 'as.bidding'] },
  { id: 'targeting', label: 'Targeting', scope: 'adset', sections: ['as.audience', 'as.keywords'] },
  { id: 'placements', label: 'Placements', scope: 'adset', sections: ['as.placements'] },
  { id: 'ads', label: 'Ads', scope: 'ad', sections: ['ad.name', 'ad.identity', 'ad.format', 'ad.media', 'ad.text', 'ad.destination'] },
  { id: 'review', label: 'Review and complete', scope: 'review', sections: ['review'] },
];

const X: PlatformDef = {
  id: 'x',
  name: 'X',
  productName: 'X Ads',
  tagline: 'Promoted posts · Timeline · Search',
  description: 'Promote posts to the timeline with keyword, follower look-alike and interest targeting in the X Ads flow.',
  color: '#0f1419',
  levels: { campaign: 'Campaign', adset: 'Ad group', ad: 'Ad', campaigns: 'Campaigns', adsets: 'Ad groups', ads: 'Ads' },
  objectiveTitle: 'What’s your campaign objective?',
  objectives: [
    { id: 'reach', label: 'Reach', group: 'Awareness', icon: '📡', kind: 'awareness', resultLabel: 'Impressions', desc: 'Maximize your ad’s reach', goodFor: [], goals: [{ id: 'reach', label: 'Reach' }] },
    { id: 'video_views', label: 'Video views', group: 'Consideration', icon: '▶️', kind: 'views', resultLabel: 'Video views', desc: 'Get people to watch your video', goodFor: [], goals: [{ id: 'views', label: '3s/100% views' }] },
    { id: 'preroll', label: 'Pre-roll views', group: 'Consideration', icon: '🎞️', kind: 'views', resultLabel: 'Video views', desc: 'Get people to watch your video before premium publisher content', goodFor: [], goals: [{ id: 'views', label: '6s views' }] },
    { id: 'app_installs', label: 'App installs', group: 'Consideration', icon: '📲', kind: 'app', resultLabel: 'App installs', desc: 'Get people to install your app', goodFor: [], goals: [{ id: 'installs', label: 'Installs' }] },
    { id: 'traffic', label: 'Website traffic', group: 'Consideration', icon: '🔗', kind: 'traffic', resultLabel: 'Link clicks', desc: 'Drive traffic to your website', goodFor: [], goals: [{ id: 'link_clicks', label: 'Link clicks' }, { id: 'site_visits', label: 'Site visits' }] },
    { id: 'engagements', label: 'Engagements', group: 'Consideration', icon: '🔁', kind: 'engagement', resultLabel: 'Engagements', desc: 'Get people to engage with your post', goodFor: [], goals: [{ id: 'engagement', label: 'Engagement' }] },
    { id: 'followers', label: 'Followers', group: 'Consideration', icon: '👤', kind: 'engagement', resultLabel: 'Follows', desc: 'Build an audience for your account', goodFor: [], goals: [{ id: 'follows', label: 'Follows' }] },
    { id: 'conversions', label: 'Website conversions', group: 'Conversion', icon: '🎯', kind: 'sales', resultLabel: 'Conversions', desc: 'Get people to take action on your website', goodFor: [], goals: [{ id: 'purchase', label: 'Purchase' }, { id: 'sign_up', label: 'Sign up' }] },
  ],
  ctas: ['Learn more', 'Shop', 'Sign up', 'Book', 'Download', 'Subscribe'],
  placements: [
    { id: 'home', label: 'Home timelines', group: 'Placements' },
    { id: 'profiles', label: 'Profiles', group: 'Placements' },
    { id: 'search', label: 'Search results', group: 'Placements' },
    { id: 'replies', label: 'Replies', group: 'Placements' },
    { id: 'xap', label: 'X Audience Platform', group: 'Placements' },
  ],
  autoPlacementLabel: 'Use all placements (recommended)',
  expansionLabel: 'Optimized targeting',
  bidLevel: 'adset',
  bidStrategies: [
    { id: 'autobid', label: 'Autobid', desc: 'Get the most results at the lowest price.' },
    { id: 'target_cost', label: 'Target cost', desc: 'Try to keep your average cost per result around a target.', amount: 'cpa', amountRequired: true, amountLabel: 'Target cost per result' },
    { id: 'max_bid', label: 'Maximum bid', desc: 'Never pay more than this per result (per click here).', amount: 'cpc', amountRequired: true, amountLabel: 'Maximum bid' },
  ],
  mediaKinds: ['image', 'video', 'carousel', 'none'],
  aspects: ['16:9', '1:1', '1.91:1'],
  defaultAspect: '16:9',
  supportsCbo: false,
  cboLabel: '',
  minBudget: { campaign: 1, adset: 1 },
  textFields: [
    { field: 'primaryText', label: 'Post text', limit: 280, recommended: 180, multiline: true, required: true, help: 'Up to 280 characters. Short posts with one clear message perform best.', placeholder: 'What’s happening?' },
    { field: 'headline', label: 'Website card headline', limit: 70, recommended: 50, help: 'Shown on the website card under your media.', placeholder: 'Add a headline' },
  ],
  bench: { cpm: 6, ctr: 0.008, cvr: 0.017, reach: 0.25 },
  layout: 'stepper',
  publishLabel: 'Launch campaign',
  createLabel: 'Create campaign',
  columns: ['status', 'results', 'resultRate', 'cpr', 'impressions', 'spend', 'budget', 'engagements', 'clicks', 'ctr'],
  steps: xSteps,
  identityLabel: 'Promoting account',
  identityHelp: 'The X account (@handle) your promoted post comes from.',
  reviewHours: 'Ads are reviewed before they start serving.',
};

const chatgptSteps = (): StepDef[] => [
  { id: 'campaign', label: 'Campaign', scope: 'campaign', sections: ['c.name', 'c.budget', 'c.bidding'] },
  { id: 'audience', label: 'Audience & context', scope: 'adset', sections: ['as.audience', 'as.topics'] },
  { id: 'ad', label: 'Ad', scope: 'ad', sections: ['ad.name', 'ad.identity', 'ad.media', 'ad.text', 'ad.destination'] },
  { id: 'review', label: 'Review', scope: 'review', sections: ['review'] },
];

const CHATGPT: PlatformDef = {
  id: 'chatgpt',
  name: 'ChatGPT',
  productName: 'ChatGPT Ads',
  tagline: 'Sponsored placements in conversations',
  description: 'Contextual sponsored cards that appear below relevant answers. Target conversation topics, not people.',
  color: '#10a37f',
  levels: { campaign: 'Campaign', adset: 'Audience', ad: 'Ad', campaigns: 'Campaigns', adsets: 'Audiences', ads: 'Ads' },
  objectiveTitle: 'What do you want to achieve?',
  objectives: [
    { id: 'awareness', label: 'Awareness', icon: '👁️', kind: 'awareness', resultLabel: 'Impressions', desc: 'Show your brand in relevant conversations to as many people as possible.', goodFor: [], goals: [{ id: 'impressions', label: 'Impressions' }] },
    { id: 'traffic', label: 'Website visits', icon: '↗️', kind: 'traffic', resultLabel: 'Clicks', desc: 'Send people from a conversation to your website.', goodFor: [], goals: [{ id: 'clicks', label: 'Clicks' }] },
    { id: 'conversions', label: 'Conversions', icon: '🎯', kind: 'sales', resultLabel: 'Conversions', desc: 'Drive purchases or sign-ups measured with the conversion tag.', goodFor: [], goals: [{ id: 'conversions', label: 'Conversions' }] },
  ],
  ctas: ['Learn more', 'Shop now', 'Sign up', 'Get started', 'Visit site', 'Book a demo'],
  placements: [
    { id: 'answers', label: 'Below answers', group: 'Placements', desc: 'Sponsored card under a relevant answer' },
    { id: 'search', label: 'ChatGPT search results', group: 'Placements', desc: 'Sponsored result in web answers' },
  ],
  autoPlacementLabel: 'All placements',
  expansionLabel: 'Broaden to related topics',
  bidLevel: 'campaign',
  bidStrategies: [
    { id: 'max_delivery', label: 'Maximum delivery (CPM)', desc: 'Spend your budget to show your ad in as many relevant conversations as possible.' },
    { id: 'cpc_cap', label: 'Cost-per-click cap', desc: 'Never pay more than a set amount per click on average.', amount: 'cpc', amountRequired: true, amountLabel: 'Max CPC' },
  ],
  mediaKinds: ['image', 'none'],
  aspects: ['1:1', '1.91:1'],
  defaultAspect: '1:1',
  supportsCbo: false,
  cboLabel: '',
  minBudget: { campaign: 10, adset: 10 },
  textFields: [
    { field: 'headline', label: 'Ad title', limit: 50, recommended: 40, required: true, help: 'Bold title on the sponsored card.', placeholder: 'e.g. Fresh-roasted coffee, delivered' },
    { field: 'description', label: 'Description', limit: 140, recommended: 110, multiline: true, required: true, help: 'Helpful, factual copy that fits the conversation. No hype.', placeholder: 'Explain how you help with what the user is asking about' },
  ],
  bench: { cpm: 45, ctr: 0.024, cvr: 0.045, reach: 0.45 },
  layout: 'stepper',
  publishLabel: 'Submit for review',
  createLabel: 'New campaign',
  columns: ['status', 'budget', 'impressions', 'clicks', 'ctr', 'cpc', 'spend', 'conversions', 'cpa', 'roas'],
  steps: chatgptSteps,
  identityLabel: 'Advertiser name',
  identityHelp: 'Shown on the card next to the “Sponsored” label.',
  reviewHours: 'Ads are reviewed against the ads policies before serving.',
};

export const PLATFORMS: Record<PlatformId, PlatformDef> = { meta: META, tiktok: TIKTOK, google: GOOGLE, x: X, chatgpt: CHATGPT };
export const PLATFORM_ORDER: PlatformId[] = ['meta', 'tiktok', 'google', 'x', 'chatgpt'];

export const objectiveOf = (p: PlatformDef, id: string): ObjectiveDef => p.objectives.find((o) => o.id === id) ?? p.objectives[0];

export function bidStrategyOf(p: PlatformDef, id: string): BidStrategyDef {
  return p.bidStrategies.find((b) => b.id === id) ?? p.bidStrategies[0];
}
