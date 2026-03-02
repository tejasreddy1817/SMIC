import { chatCompletion, safeParseJson } from "../utils/openai";
import { Trend, AgentContext, TrendSignal, SignalsResult } from "./types";

/**
 * Signals & Weighting Agent (Agent 2)
 *
 * Takes raw trends from Agent 1 and applies a multi-factor scoring model:
 * - Engagement velocity (rate of engagement growth)
 * - Search growth (search volume acceleration)
 * - News freshness (recency of news cycle)
 * - Cross-platform presence (spread across platforms)
 * - Content saturation (penalize oversaturated topics)
 * - Decay model (estimated daily decay rate)
 *
 * Outputs re-ranked trends with transparent weighted scores.
 */

// Default weights (can be adjusted by Feedback Learning Agent over time)
const DEFAULT_WEIGHTS = {
  velocity: 0.25,
  search: 0.20,
  freshness: 0.20,
  crossPlatform: 0.20,
  saturationPenalty: 0.15, // subtracted, not added
};

export async function runSignalsAgent(
  openaiKey: string,
  trends: Trend[],
  context?: AgentContext
): Promise<SignalsResult> {
  if (!trends.length) {
    return { signals: [], rankedTrends: [] };
  }

  const locLabel = context?.location?.location
    ? `${context.location.location.country} (${context.location.location.countryCode})`
    : "Global";

  const niches = context?.creatorNiches?.join(", ") || "general";
  const platforms = context?.creatorPlatforms?.join(", ") || "all";

  const system = {
    role: "system",
    content: `You are a trend intelligence analyst specializing in signal detection and weighting. You analyze raw trend data and score each trend across multiple dimensions to produce a final weighted composite score. Be data-driven and precise. Output only a JSON array.`,
  };

  const user = {
    role: "user",
    content: `Location: ${locLabel}
Creator niches: ${niches}
Target platforms: ${platforms}

Analyze these trends and score each one across the following dimensions (all 0-100 unless noted):

1. engagementVelocity: How fast engagement is growing (consider the strength and platform spread)
2. searchGrowth: Estimated search volume growth rate
3. newsFreshness: How fresh this is in the news cycle (100 = breaking now, 0 = weeks old)
4. crossPlatformPresence: Count of distinct platforms (raw number)
5. contentSaturation: How saturated is this topic already (100 = very saturated, bad for new creators)
6. decayRate: Estimated daily decay factor 0.0-1.0 (1.0 = no decay, 0.5 = halves daily)

Also compute weightedScore using: velocity*0.25 + search*0.20 + freshness*0.20 + crossPlatform_normalized*0.20 - saturation*0.15

Trends data:
${JSON.stringify(trends.map(t => ({
  name: t.name,
  strength: t.strength,
  platforms: t.platforms,
  engagementVelocity: t.engagementVelocity,
  crossPlatformPresence: t.crossPlatformPresence,
  recency: t.recency,
  category: t.category,
  sentiment: t.sentiment,
  keywords: t.keywords,
})))}

Return a JSON array of objects with these fields:
- trendName: string
- engagementVelocity: number (0-100)
- searchGrowth: number (0-100)
- newsFreshness: number (0-100)
- crossPlatformPresence: number (platform count)
- contentSaturation: number (0-100)
- decayRate: number (0-1)
- weightedScore: number (0-100)
- breakdown: { velocityWeight, searchWeight, freshnessWeight, crossPlatformWeight, saturationPenalty }`,
  };

  let signals: TrendSignal[];

  try {
    const out = await chatCompletion(openaiKey, [system, user], { max_tokens: 2000 });
    const message = out.choices?.[0]?.message?.content || "";
    const parsed = safeParseJson(message);

    if (Array.isArray(parsed)) {
      signals = parsed.map((s: any) => ({
        trendName: s.trendName || "unknown",
        engagementVelocity: clamp(s.engagementVelocity, 0, 100),
        searchGrowth: clamp(s.searchGrowth, 0, 100),
        newsFreshness: clamp(s.newsFreshness, 0, 100),
        crossPlatformPresence: Math.max(1, Number(s.crossPlatformPresence) || 1),
        contentSaturation: clamp(s.contentSaturation, 0, 100),
        decayRate: clamp(s.decayRate, 0, 1),
        weightedScore: clamp(s.weightedScore, 0, 100),
        breakdown: {
          velocityWeight: Number(s.breakdown?.velocityWeight) || 0,
          searchWeight: Number(s.breakdown?.searchWeight) || 0,
          freshnessWeight: Number(s.breakdown?.freshnessWeight) || 0,
          crossPlatformWeight: Number(s.breakdown?.crossPlatformWeight) || 0,
          saturationPenalty: Number(s.breakdown?.saturationPenalty) || 0,
        },
        timestamp: new Date().toISOString(),
      }));
    } else {
      console.warn("[SignalsAgent] Failed to parse AI response, computing from raw data");
      signals = trends.map((t) => computeFallbackSignal(t));
    }
  } catch (err: any) {
    console.warn("[SignalsAgent] AI call failed, computing from raw data:", err.message);
    signals = trends.map((t) => computeFallbackSignal(t));
  }

  // Re-rank trends by weighted score
  const scoreMap = new Map(signals.map((s) => [s.trendName, s.weightedScore]));
  const rankedTrends = [...trends].sort((a, b) => {
    const scoreA = scoreMap.get(a.name) ?? a.strength;
    const scoreB = scoreMap.get(b.name) ?? b.strength;
    return scoreB - scoreA;
  });

  return { signals, rankedTrends };
}

function clamp(val: any, min: number, max: number): number {
  return Math.max(min, Math.min(max, Number(val) || 0));
}

function computeFallbackSignal(trend: Trend): TrendSignal {
  const velocity = trend.engagementVelocity || trend.strength * 0.8;
  const search = trend.strength * 0.7;
  const freshness = 60; // assume moderately fresh
  const cpNormalized = Math.min(100, (trend.crossPlatformPresence || 1) * 25);
  const saturation = 30; // assume moderate

  const weighted =
    velocity * DEFAULT_WEIGHTS.velocity +
    search * DEFAULT_WEIGHTS.search +
    freshness * DEFAULT_WEIGHTS.freshness +
    cpNormalized * DEFAULT_WEIGHTS.crossPlatform -
    saturation * DEFAULT_WEIGHTS.saturationPenalty;

  return {
    trendName: trend.name,
    engagementVelocity: Math.round(velocity),
    searchGrowth: Math.round(search),
    newsFreshness: freshness,
    crossPlatformPresence: trend.crossPlatformPresence || 1,
    contentSaturation: saturation,
    decayRate: 0.85,
    weightedScore: Math.round(Math.max(0, Math.min(100, weighted))),
    breakdown: {
      velocityWeight: Math.round(velocity * DEFAULT_WEIGHTS.velocity),
      searchWeight: Math.round(search * DEFAULT_WEIGHTS.search),
      freshnessWeight: Math.round(freshness * DEFAULT_WEIGHTS.freshness),
      crossPlatformWeight: Math.round(cpNormalized * DEFAULT_WEIGHTS.crossPlatform),
      saturationPenalty: Math.round(saturation * DEFAULT_WEIGHTS.saturationPenalty),
    },
    timestamp: new Date().toISOString(),
  };
}
