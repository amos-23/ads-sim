export interface ScenarioKeyword {
  text: string;
  /** Daily searches in the United States. */
  volume: number;
  /** Typical market cost-per-click in USD. */
  cpc: number;
}

export interface Scenario {
  id: string;
  brand: string;
  emoji: string;
  industry: string;
  pitch: string;
  /** The business outcome the student is accountable for. */
  goal: 'sales' | 'leads';
  goalLabel: string;
  hasApp: boolean;
  /** Average order value (sales) or value per lead (leads). */
  value: number;
  targetCpa: number;
  suggestedDailyBudget: number;
  url: string;
  idealAge: [number, number];
  idealGender: 'all' | 'male' | 'female';
  idealInterests: string[];
  /** Terms that make copy and keywords relevant. */
  relevantTerms: string[];
  keywords: ScenarioKeyword[];
  chatTopics: string[];
  cpmMult: number;
  ctrMult: number;
  cvrMult: number;
  tips: string[];
}

export const SCENARIOS: Scenario[] = [
  {
    id: 'brewly',
    brand: 'Brewly Coffee Co.',
    emoji: '☕',
    industry: 'E-commerce · Food & drink',
    pitch: 'Small-batch specialty coffee, roasted to order and delivered on a flexible subscription.',
    goal: 'sales',
    goalLabel: 'First subscription orders',
    hasApp: false,
    value: 32,
    targetCpa: 24,
    suggestedDailyBudget: 50,
    url: 'https://brewly.example/shop',
    idealAge: [25, 44],
    idealGender: 'all',
    idealInterests: ['Coffee', 'Espresso', 'Cafés', 'Specialty food', 'Subscription boxes', 'Cooking'],
    relevantTerms: ['coffee', 'bean', 'beans', 'roast', 'espresso', 'brew', 'subscription', 'specialty', 'fresh', 'barista', 'latte', 'cup'],
    keywords: [
      { text: 'coffee subscription', volume: 900, cpc: 1.9 },
      { text: 'buy coffee beans online', volume: 650, cpc: 1.4 },
      { text: 'specialty coffee', volume: 1100, cpc: 1.1 },
      { text: 'best coffee beans', volume: 2400, cpc: 1.2 },
      { text: 'fresh roasted coffee', volume: 400, cpc: 1.6 },
      { text: 'espresso beans', volume: 1300, cpc: 1.0 },
      { text: 'coffee', volume: 30000, cpc: 0.7 },
    ],
    chatTopics: ['Food & drink', 'Cooking & recipes', 'Shopping & gifts'],
    cpmMult: 1,
    ctrMult: 1,
    cvrMult: 1,
    tips: [
      'Coffee is an impulse-friendly product — strong visuals and an offer (e.g. first bag 30% off) lift CTR.',
      'High-intent search terms like “coffee subscription” convert far better than the generic term “coffee”.',
    ],
  },
  {
    id: 'fitpulse',
    brand: 'FitPulse',
    emoji: '💪',
    industry: 'Mobile app · Health & fitness',
    pitch: 'A 20-minute home workout app with personalised plans. Grow free-trial sign-ups.',
    goal: 'leads',
    goalLabel: 'Free-trial sign-ups',
    hasApp: true,
    value: 18,
    targetCpa: 7,
    suggestedDailyBudget: 40,
    url: 'https://fitpulse.example/trial',
    idealAge: [18, 34],
    idealGender: 'all',
    idealInterests: ['Fitness', 'Gym', 'Running', 'Yoga', 'Health & wellness'],
    relevantTerms: ['workout', 'fitness', 'fit', 'gym', 'exercise', 'training', 'home', 'plan', 'app', 'strength', 'cardio', 'trial'],
    keywords: [
      { text: 'home workout app', volume: 1500, cpc: 1.3 },
      { text: 'workout plan', volume: 3200, cpc: 0.9 },
      { text: 'fitness app', volume: 2800, cpc: 1.5 },
      { text: '20 minute workout', volume: 900, cpc: 0.6 },
      { text: 'personal trainer app', volume: 500, cpc: 1.8 },
      { text: 'workout', volume: 25000, cpc: 0.5 },
    ],
    chatTopics: ['Fitness & sports', 'Productivity & habits', 'Technology'],
    cpmMult: 0.95,
    ctrMult: 1.05,
    cvrMult: 1.15,
    tips: [
      'App installs and sign-ups are cheap but fragile — video that shows the workout in the first 2 seconds wins.',
      'Avoid “before/after” body claims or “Are you overweight?” copy — platforms reject personal-attribute language.',
    ],
  },
  {
    id: 'nova',
    brand: 'Nova Skin',
    emoji: '✨',
    industry: 'E-commerce · Beauty',
    pitch: 'Clean, dermatologist-tested skincare. Launching a new Vitamin C serum.',
    goal: 'sales',
    goalLabel: 'Serum purchases',
    hasApp: false,
    value: 48,
    targetCpa: 30,
    suggestedDailyBudget: 60,
    url: 'https://novaskin.example/vitamin-c',
    idealAge: [18, 34],
    idealGender: 'female',
    idealInterests: ['Skincare', 'Beauty', 'Cosmetics', 'Fashion', 'Online shopping'],
    relevantTerms: ['skin', 'skincare', 'serum', 'vitamin', 'glow', 'clean', 'beauty', 'routine', 'dermatologist', 'radiant', 'hydrate'],
    keywords: [
      { text: 'vitamin c serum', volume: 5400, cpc: 1.7 },
      { text: 'best vitamin c serum', volume: 2200, cpc: 2.1 },
      { text: 'clean skincare', volume: 1300, cpc: 1.5 },
      { text: 'skincare routine', volume: 4000, cpc: 0.8 },
      { text: 'glowing skin serum', volume: 600, cpc: 1.6 },
      { text: 'skincare', volume: 20000, cpc: 0.9 },
    ],
    chatTopics: ['Beauty & fashion', 'Shopping & gifts', 'Lifestyle'],
    cpmMult: 1.1,
    ctrMult: 1.05,
    cvrMult: 0.95,
    tips: [
      'Beauty audiences respond to UGC-style creative and real texture shots.',
      'Never promise medical results (“cures acne”, “guaranteed”) — that triggers policy rejection.',
    ],
  },
  {
    id: 'ledgerleaf',
    brand: 'LedgerLeaf',
    emoji: '📒',
    industry: 'B2B SaaS · Finance',
    pitch: 'Simple accounting & invoicing software for small businesses. Generate demo requests.',
    goal: 'leads',
    goalLabel: 'Demo requests',
    hasApp: false,
    value: 140,
    targetCpa: 65,
    suggestedDailyBudget: 80,
    url: 'https://ledgerleaf.example/demo',
    idealAge: [28, 55],
    idealGender: 'all',
    idealInterests: ['Small business', 'Entrepreneurship', 'Accounting', 'Finance', 'Productivity'],
    relevantTerms: ['accounting', 'invoice', 'invoicing', 'bookkeeping', 'small business', 'software', 'tax', 'expenses', 'payroll', 'demo', 'finance'],
    keywords: [
      { text: 'accounting software for small business', volume: 1900, cpc: 9.5 },
      { text: 'invoicing software', volume: 1600, cpc: 7.8 },
      { text: 'bookkeeping software', volume: 1100, cpc: 8.4 },
      { text: 'online accounting', volume: 900, cpc: 6.2 },
      { text: 'free invoice template', volume: 6000, cpc: 1.2 },
      { text: 'accounting', volume: 18000, cpc: 3.1 },
    ],
    chatTopics: ['Business & finance', 'Productivity & habits', 'Technology'],
    cpmMult: 1.45,
    ctrMult: 0.8,
    cvrMult: 0.7,
    tips: [
      'B2B is expensive per click — tight targeting and high-intent keywords matter more than reach.',
      '“free invoice template” gets lots of searches but people looking for free stuff rarely book demos.',
    ],
  },
];

export const scenarioById = (id: string) => SCENARIOS.find((s) => s.id === id) ?? SCENARIOS[0];

export const ALL_INTERESTS = [
  'Coffee', 'Espresso', 'Cafés', 'Cooking', 'Specialty food', 'Subscription boxes',
  'Fitness', 'Gym', 'Running', 'Yoga', 'Health & wellness',
  'Skincare', 'Beauty', 'Cosmetics', 'Fashion', 'Online shopping',
  'Small business', 'Entrepreneurship', 'Accounting', 'Finance', 'Productivity',
  'Technology', 'Gaming', 'Travel', 'Sports', 'Music', 'Parenting', 'Pets', 'Sustainability', 'Home decor',
];

export const ALL_TOPICS = [
  'Food & drink', 'Cooking & recipes', 'Shopping & gifts', 'Fitness & sports', 'Productivity & habits',
  'Technology', 'Beauty & fashion', 'Lifestyle', 'Business & finance', 'Travel', 'Education',
  'Entertainment', 'Health & medical', 'Politics & news', 'Mental health',
];

/** Topics that ChatGPT ads will not serve against. */
export const RESTRICTED_TOPICS = ['Health & medical', 'Politics & news', 'Mental health'];

export interface LocationDef {
  id: string;
  label: string;
  /** Online adult population in millions (rough). */
  pop: number;
  /** Relative ad-cost index vs the US. */
  costIdx: number;
}

export const LOCATIONS: LocationDef[] = [
  { id: 'US', label: 'United States', pop: 230, costIdx: 1 },
  { id: 'GB', label: 'United Kingdom', pop: 50, costIdx: 0.85 },
  { id: 'CA', label: 'Canada', pop: 30, costIdx: 0.85 },
  { id: 'AU', label: 'Australia', pop: 20, costIdx: 0.9 },
  { id: 'DE', label: 'Germany', pop: 65, costIdx: 0.8 },
  { id: 'IN', label: 'India', pop: 450, costIdx: 0.18 },
  { id: 'NG', label: 'Nigeria', pop: 60, costIdx: 0.15 },
  { id: 'KE', label: 'Kenya', pop: 20, costIdx: 0.15 },
  { id: 'ZA', label: 'South Africa', pop: 30, costIdx: 0.3 },
  { id: 'BR', label: 'Brazil', pop: 140, costIdx: 0.3 },
];

export const locationById = (id: string) => LOCATIONS.find((l) => l.id === id);
