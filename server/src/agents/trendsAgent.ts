import { chatCompletion, safeParseJson } from "../utils/openai";
import { Trend, AgentContext } from "./types";
import { locationLabel } from "../services/location.service";
import {
  fetchGoogleTrends,
  fetchInstagramHashtags,
  fetchYouTubeTrending,
  fetchFacebookTrending,
  fetchWay2News,
  fetchNewsHeadlines,
  SMICulateTrends,
} from "./connectors";

/**
 * Trends Agent (Agent 1 — Location-Aware)
 *
 * Discovers location-specific trending topics across social media and news.
 * Integrates: Instagram, Google, YouTube, Way2News, NewsAPI
 * Processes viral video transcripts when available in context.
 */
export async function runTrendsAgent(
  openaiKey: string,
  context?: AgentContext
): Promise<Trend[]> {
  const countryCode = context?.location?.location?.countryCode;
  const lang = context?.location?.contentLanguages?.[0];
  const locLabel = context?.location ? locationLabel(context.location.location) : "Global";

  // 1. Fetch from all connectors in parallel (location-scoped)
  const [google, youtube, instagram, facebook, way2news, news] = await Promise.all([
    fetchGoogleTrends(countryCode).catch(() => []),
    fetchYouTubeTrending(countryCode).catch(() => []),
    fetchInstagramHashtags(countryCode).catch(() => []),
    fetchFacebookTrending(countryCode).catch(() => []),
    fetchWay2News(countryCode, lang).catch(() => []),
    fetchNewsHeadlines(countryCode).catch(() => []),
  ]);

  let raw = [...google, ...youtube, ...instagram, ...facebook, ...way2news, ...news].filter(Boolean);

  if (!raw.length) {
    raw = await SMICulateTrends(countryCode);
  }

  // 2. Include transcript-derived keywords if available
  let transcriptContext = "";
  if (context?.transcript?.fullText) {
    const words = context.transcript.fullText.slice(0, 1500);
    transcriptContext = `\n\nAdditional context from video transcript (extract themes and keywords from this):\n"${words}"`;
  }

  // 3. Use AI to normalize, rank, and enrich trend data
  const system = {
    role: "system",
    content: `You are a location-aware trend analyst specializing in ${locLabel}. You aggregate raw trend data from multiple platforms and news sources into structured, ranked trend intelligence. Consider location relevance, engagement velocity, cross-platform presence, and recency. Output only a JSON array.`,
  };

  const user = {
    role: "user",
    content: `Location: ${locLabel}
Country Code: ${countryCode || "US"}
Local platforms: ${context?.location?.localPlatforms?.join(", ") || "Instagram, YouTube, TikTok"}
Cultural context: ${context?.location?.culturalPreferences?.join("; ") || "general"}

Raw trend data from multiple sources:
${JSON.stringify(raw)}${transcriptContext}

Analyze and return a ranked JSON array of trending topics. Each object must include:
- name: topic name
- location: "${locLabel}"
- platforms: string[] (source platforms like Instagram, Google, YouTube, Way2News, etc.)
- strength: number 0-100 (overall trend score)
- explanation: short contextual summary
- engagementVelocity: number 0-100 (rate of growth)
- crossPlatformPresence: number (count of platforms where this is trending)
- recency: ISO timestamp or relative time
- category: one of "viral_video", "hashtag", "news", "topic", "audio"
- sentiment: "positive" | "negative" | "neutral" | "mixed"
- keywords: string[] (3-5 key terms)

Rank by: location relevance > engagement velocity > cross-platform presence > recency.`,
  };

  try {
    const out = await chatCompletion(openaiKey, [system, user], { max_tokens: 1500 });
    const message = out.choices?.[0]?.message?.content || "";
    const parsed = safeParseJson(message);

    if (Array.isArray(parsed)) {
      return parsed.map((t: any) => ({
        name: t.name || "unknown",
        location: t.location || locLabel,
        platforms: Array.isArray(t.platforms) ? t.platforms : [],
        strength: Math.max(0, Math.min(100, Number(t.strength) || 50)),
        explanation: t.explanation || "",
        engagementVelocity: Math.max(0, Math.min(100, Number(t.engagementVelocity) || 0)),
        crossPlatformPresence: Number(t.crossPlatformPresence) || 1,
        recency: t.recency || new Date().toISOString(),
        category: t.category || "topic",
        sentiment: t.sentiment || "neutral",
        keywords: Array.isArray(t.keywords) ? t.keywords : [],
      }));
    }
  } catch (err: any) {
    console.warn("[TrendsAgent] AI call failed, using raw data fallback:", err.message);
  }

  // Fallback: normalize raw data
  console.warn("[TrendsAgent] Using raw data fallback");
  return raw.map((r: any) => ({
    name: r.name || "unknown",
    location: locLabel,
    platforms: r.platforms || [],
    strength: r.score || 50,
    explanation: r.explanation || "",
    engagementVelocity: 0,
    crossPlatformPresence: (r.platforms || []).length,
    recency: new Date().toISOString(),
    category: r.category || "topic",
    sentiment: "neutral",
    keywords: [],
  }));
}
