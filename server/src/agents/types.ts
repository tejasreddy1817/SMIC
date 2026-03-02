// ─── Location Types ─────────────────────────────────────────────────
export interface GeoLocation {
  country: string;
  countryCode: string; // ISO 3166-1 alpha-2
  state?: string;
  city?: string;
  region?: string; // continent or sub-region
  coordinates?: { lat: number; lng: number };
  languages?: string[]; // BCP 47 codes
  timezone?: string;
}

export interface LocationContext {
  location: GeoLocation;
  culturalPreferences?: string[];
  contentLanguages?: string[]; // preferred content languages
  localPlatforms?: string[]; // region-popular platforms
}

// ─── Agent Context (shared across all agents) ────────────────────────
export interface AgentContext {
  location: LocationContext;
  transcript?: {
    fullText: string;
    segments?: { start: number; end: number; text: string }[];
    language?: string;
    duration?: number;
    wordCount?: number;
  };
  mediaType?: "video" | "audio" | "text";
  mediaDuration?: number;
  creatorNiches?: string[];
  creatorPlatforms?: string[];
  creatorLanguages?: string[];
}

// ─── Trend Types ────────────────────────────────────────────────────
export type Trend = {
  name: string;
  location: string;
  platforms: string[]; // source platforms
  strength: number; // 0-100
  explanation: string;
  engagementVelocity?: number; // 0-100 rate of growth
  crossPlatformPresence?: number; // count of platforms
  recency?: string; // ISO timestamp or relative
  category?: "viral_video" | "hashtag" | "news" | "topic" | "audio";
  sentiment?: "positive" | "negative" | "neutral" | "mixed";
  keywords?: string[];
};

// ─── Idea Types ─────────────────────────────────────────────────────
export type Idea = {
  id: string;
  trend: string;
  platform: string;
  title: string;
  description: string;
  style: "educational" | "entertaining" | "news_explainer" | "storytelling" | "opinion" | string;
  format?: "reel" | "short" | "post" | "long_form" | string;
  creativityScore: number; // 0-100
  executionEase: number; // 0-100
  locationRelevance?: number; // 0-100
  language?: string;
  culturalNotes?: string;
};

// ─── Script Types ───────────────────────────────────────────────────
export type Script = {
  id: string;
  ideaId: string;
  platform: string;
  tone: string;
  lengthSeconds?: number;
  content: string;
  hook?: string; // first 3-5 seconds
  structure?: "hook_value_payoff_cta" | string;
  language?: string;
  rank?: number; // 1-10 within its idea
};

// ─── Prediction Types ───────────────────────────────────────────────
export type Prediction = {
  scriptId: string;
  viralProbability: number; // 0-100
  confidence: number; // 0-100
  explanation: string;
  suggestions?: string[];
  factors?: {
    trendMomentum: number;
    topicSaturation: number;
    ideaOriginality: number;
    scriptQuality: number;
    hookStrength: number;
    platformFit: number;
  };
};

// ─── Signal Types (Signals & Weighting Agent) ──────────────────────
export interface TrendSignal {
  trendName: string;
  engagementVelocity: number; // 0-100 — rate of engagement growth
  searchGrowth: number; // 0-100 — search volume growth rate
  newsFreshness: number; // 0-100 — how recent the news cycle is
  crossPlatformPresence: number; // count of platforms with activity
  contentSaturation: number; // 0-100 — how saturated the topic is (high = bad)
  decayRate: number; // 0-1 — estimated daily decay factor
  weightedScore: number; // final composite score 0-100
  breakdown: {
    velocityWeight: number;
    searchWeight: number;
    freshnessWeight: number;
    crossPlatformWeight: number;
    saturationPenalty: number;
  };
  timestamp: string; // ISO
}

export interface SignalsResult {
  signals: TrendSignal[];
  rankedTrends: Trend[]; // trends re-ordered by weighted score
}

// ─── Feedback Types (Feedback Learning Agent) ──────────────────────
export interface ContentPerformance {
  contentId: string;
  platform: string;
  publishedAt: string; // ISO
  metrics: {
    views: number;
    likes: number;
    comments: number;
    shares: number;
    saves?: number;
    watchTime?: number; // average seconds
    clickThroughRate?: number; // 0-1
  };
  predictedViralProbability?: number; // what we predicted
  actualPerformance?: "viral" | "above_average" | "average" | "below_average" | "flop";
}

export interface FeedbackInsight {
  category: "trend_accuracy" | "script_quality" | "hook_effectiveness" | "platform_fit" | "timing";
  insight: string;
  confidence: number; // 0-100
  actionable: string; // what to do differently
  basedOnSamples: number; // how many data points
}

export interface FeedbackResult {
  insights: FeedbackInsight[];
  modelAdjustments: {
    trendWeightUpdates?: Record<string, number>; // trend category → weight delta
    hookPatterns?: { effective: string[]; ineffective: string[] };
    platformTimingHints?: Record<string, string>; // platform → best posting time
    nicheSaturation?: Record<string, number>; // niche → saturation score
  };
  overallAccuracy: number; // 0-100 — prediction accuracy score
  samplesAnalyzed: number;
}

// ─── News Script Types (5-Agent Pipeline) ──────────────────────────
export interface NewsItem {
  id: string;
  title: string;
  summary: string;
  source: string;
  category: string;
  publishedAt: string;
  url?: string;
  relevanceScore: number;
  location?: string;
}

export interface EnrichedNewsItem extends NewsItem {
  keywords: string[];
  sentiment: "positive" | "negative" | "neutral" | "mixed";
  targetAudience: string;
  trendConnection: string;
  culturalRelevance: number; // 0-100
}

export interface ValidatedNewsItem extends EnrichedNewsItem {
  factualConfidence: number; // 0-100
  timeliness: number; // 0-100
  contentSuitability: number; // 0-100
  validationScore: number; // composite 0-100
}

export interface NewsScript {
  id: string;
  newsItemId: string;
  title: string;
  hook: string;
  context: string;
  body: string;
  cta: string;
  fullScript: string;
  wordCount: number;
  estimatedDuration: number; // seconds
  platform: string;
  tone: string;
  language: string;
}

export interface RefinedNewsScript extends NewsScript {
  refinementNotes: string[];
  readabilityScore: number; // 0-100
  hookStrength: number; // 0-100
  engagementPotential: number; // 0-100
  originalWordCount: number;
  trimmed: boolean;
}

export interface NewsScriptOptions {
  openaiKey: string;
  country: string;
  state?: string;
  city?: string;
  niches?: string[];
  platforms?: string[];
  languages?: string[];
  searchQuery?: string; // Person, topic, event, or area to focus on
}

export interface NewsScriptResult {
  location: LocationContext;
  newsItems: ValidatedNewsItem[];
  scripts: RefinedNewsScript[];
  meta: {
    executionTimeMs: number;
    agentsExecuted: string[];
  };
}

// ─── Pipeline Result ────────────────────────────────────────────────
export interface PipelineResult {
  location: LocationContext;
  trends: Trend[];
  signals?: SignalsResult;
  ideas: Idea[];
  scripts: Script[];
  predictions: Prediction[];
  feedback?: FeedbackResult;
  meta: {
    mediaId?: string;
    transcriptLength?: number;
    wordCount?: number;
    mediaType?: string;
    mediaDuration?: number;
    executionTimeMs: number;
    agentsExecuted: string[];
  };
}
