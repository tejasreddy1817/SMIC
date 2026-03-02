/**
 * News & Trends Script Generation Agent — 5-Agent Pipeline
 *
 * Pipeline: Retrieval → Enrichment → Validation → Script Generation → Refinement
 *
 * Each agent receives an AgentContext for location-aware, culturally-adapted output.
 */

import axios from "axios";
import {
  AgentContext,
  LocationContext,
  NewsItem,
  EnrichedNewsItem,
  ValidatedNewsItem,
  NewsScript,
  RefinedNewsScript,
  NewsScriptOptions,
  NewsScriptResult,
} from "./types";
import {
  fetchNewsHeadlines,
  fetchWay2News,
  fetchYouTubeTrending,
  fetchFacebookTrending,
  searchByQuery,
  SMICulateTrends,
  RawTrendItem,
} from "./connectors";
import { buildLocationContext, parseLocationString, locationLabel } from "../services/location.service";
import { getCountryName, getStateName } from "../data/geo-hierarchy";

// ─── Helper: Call OpenAI ─────────────────────────────────────────────
async function callOpenAI(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
  maxTokens = 4000
): Promise<string> {
  const resp = await axios.post(
    "https://api.openai.com/v1/chat/completions",
    {
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: maxTokens,
    },
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      timeout: 60000,
    }
  );
  return resp.data?.choices?.[0]?.message?.content || "";
}

function safeParseJSON<T>(text: string): T | null {
  try {
    // Strip markdown code fences if present
    const cleaned = text.replace(/```(?:json)?\s*/g, "").replace(/```\s*$/g, "").trim();
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}

function generateId(): string {
  return `ns_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// ─── Agent 1: Retrieval Agent ────────────────────────────────────────
async function runRetrievalAgent(
  openaiKey: string,
  context: AgentContext,
  searchQuery?: string
): Promise<NewsItem[]> {
  const cc = context.location.location.countryCode || "US";
  const langs = context.location.contentLanguages || ["en"];

  let allRaw: RawTrendItem[];

  if (searchQuery && searchQuery.trim().length > 0) {
    // Targeted search: person, topic, event, press conference
    console.log(`[NewsScript/Retrieval] Searching for: "${searchQuery}"`);
    const [searchResults, newsItems, fallbackItems] = await Promise.all([
      searchByQuery(searchQuery.trim(), cc, langs[0]),
      fetchNewsHeadlines(cc),
      SMICulateTrends(cc),
    ]);
    allRaw = [
      ...searchResults,
      ...newsItems,
      ...(searchResults.length === 0 ? fallbackItems : []),
    ];
  } else {
    // General discovery: fetch from all connectors
    const [newsItems, way2newsItems, ytItems, fbItems, fallbackItems] = await Promise.all([
      fetchNewsHeadlines(cc),
      fetchWay2News(cc, langs[0]),
      fetchYouTubeTrending(cc),
      fetchFacebookTrending(cc),
      SMICulateTrends(cc),
    ]);
    allRaw = [
      ...newsItems,
      ...way2newsItems,
      ...ytItems,
      ...fbItems,
      ...(newsItems.length === 0 && way2newsItems.length === 0 && fbItems.length === 0 ? fallbackItems : []),
    ];
  }

  if (allRaw.length === 0) {
    // Final fallback: generate simulated news items
    return getSimulatedNewsItems(cc);
  }

  // Normalize raw items to NewsItem format
  const items: NewsItem[] = allRaw.map((raw, i) => ({
    id: generateId(),
    title: raw.name,
    summary: raw.explanation || "",
    source: raw.source,
    category: raw.category || "news",
    publishedAt: new Date().toISOString(),
    url: raw.url,
    relevanceScore: raw.score,
    location: raw.location || cc,
  }));

  // Deduplicate by title similarity
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = item.title.toLowerCase().slice(0, 40);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 20); // Cap at 20 items
}

function getSimulatedNewsItems(countryCode: string): NewsItem[] {
  return [
    {
      id: generateId(),
      title: "Tech Industry Sees Major AI Breakthrough",
      summary: "New advances in artificial intelligence are reshaping how businesses operate globally.",
      source: "simulated",
      category: "technology",
      publishedAt: new Date().toISOString(),
      relevanceScore: 85,
      location: countryCode,
    },
    {
      id: generateId(),
      title: "Climate Summit Announces New Green Initiatives",
      summary: "World leaders commit to ambitious sustainability targets at the annual climate conference.",
      source: "simulated",
      category: "environment",
      publishedAt: new Date().toISOString(),
      relevanceScore: 78,
      location: countryCode,
    },
    {
      id: generateId(),
      title: "Sports Championship Final Breaks Viewership Records",
      summary: "The highly anticipated final drew millions of viewers worldwide.",
      source: "simulated",
      category: "sports",
      publishedAt: new Date().toISOString(),
      relevanceScore: 82,
      location: countryCode,
    },
    {
      id: generateId(),
      title: "New Economic Policy Aims to Boost Small Businesses",
      summary: "Government announces tax relief and funding programs for entrepreneurs.",
      source: "simulated",
      category: "business",
      publishedAt: new Date().toISOString(),
      relevanceScore: 70,
      location: countryCode,
    },
    {
      id: generateId(),
      title: "Viral Social Media Trend Sweeps the Nation",
      summary: "A creative challenge originating from local creators goes global.",
      source: "simulated",
      category: "entertainment",
      publishedAt: new Date().toISOString(),
      relevanceScore: 88,
      location: countryCode,
    },
  ];
}

// ─── Agent 2: Enrichment Agent ───────────────────────────────────────
async function runEnrichmentAgent(
  openaiKey: string,
  newsItems: NewsItem[],
  context: AgentContext
): Promise<EnrichedNewsItem[]> {
  const locLabel = locationLabel(context.location.location);
  const culture = context.location.culturalPreferences?.join(", ") || "general";
  const niches = context.creatorNiches?.join(", ") || "general";

  const systemPrompt = `You are a news enrichment analyst specializing in content for ${locLabel}.
You add semantic metadata to news items for content creators.
Always respond with valid JSON only. No markdown.`;

  const userPrompt = `Enrich these news items with semantic metadata for content creation in ${locLabel}.
Cultural context: ${culture}
Creator niches: ${niches}

News items:
${JSON.stringify(newsItems.slice(0, 15), null, 2)}

For each item, add:
- keywords: string[] (5-8 relevant keywords)
- sentiment: "positive" | "negative" | "neutral" | "mixed"
- targetAudience: string (who would care about this)
- trendConnection: string (how it connects to current trends)
- culturalRelevance: number 0-100 (how relevant to ${locLabel} audience)

Return a JSON array with all original fields plus the new fields. JSON only, no markdown.`;

  try {
    const raw = await callOpenAI(openaiKey, systemPrompt, userPrompt, 4000);
    const parsed = safeParseJSON<any[]>(raw);

    if (parsed && Array.isArray(parsed)) {
      return parsed.map((item, i) => ({
        ...newsItems[i],
        ...item,
        id: newsItems[i]?.id || generateId(),
        keywords: Array.isArray(item.keywords) ? item.keywords : [],
        sentiment: item.sentiment || "neutral",
        targetAudience: item.targetAudience || "general audience",
        trendConnection: item.trendConnection || "",
        culturalRelevance: typeof item.culturalRelevance === "number" ? item.culturalRelevance : 50,
      }));
    }
  } catch (err: any) {
    console.warn("[NewsScript/Enrichment] AI enrichment failed:", err.message);
  }

  // Fallback: basic enrichment without AI
  return newsItems.map((item) => ({
    ...item,
    keywords: item.title.split(/\s+/).filter((w) => w.length > 3).slice(0, 5),
    sentiment: "neutral" as const,
    targetAudience: "general audience",
    trendConnection: item.category,
    culturalRelevance: 50,
  }));
}

// ─── Agent 3: Validation Agent ───────────────────────────────────────
async function runValidationAgent(
  openaiKey: string,
  enrichedItems: EnrichedNewsItem[],
  context: AgentContext
): Promise<ValidatedNewsItem[]> {
  const locLabel = locationLabel(context.location.location);

  const systemPrompt = `You are a news validation analyst. Score each news item for factual confidence, timeliness, and content suitability for short-form video scripts.
Always respond with valid JSON only. No markdown.`;

  const userPrompt = `Validate these enriched news items for script generation targeting ${locLabel} audience.

Items:
${JSON.stringify(enrichedItems.slice(0, 15), null, 2)}

For each item, score:
- factualConfidence: 0-100 (how likely the info is accurate)
- timeliness: 0-100 (how current/relevant right now)
- contentSuitability: 0-100 (how suitable for short-form video scripts)
- validationScore: 0-100 (composite score: avg of above three)

Filter out items with factualConfidence < 40 OR timeliness < 30.
Return a JSON array sorted by validationScore descending. JSON only, no markdown.`;

  try {
    const raw = await callOpenAI(openaiKey, systemPrompt, userPrompt, 3000);
    const parsed = safeParseJSON<any[]>(raw);

    if (parsed && Array.isArray(parsed)) {
      const validated: ValidatedNewsItem[] = parsed
        .map((item, i) => ({
          ...enrichedItems[i],
          ...item,
          id: enrichedItems[i]?.id || item.id || generateId(),
          factualConfidence: typeof item.factualConfidence === "number" ? item.factualConfidence : 50,
          timeliness: typeof item.timeliness === "number" ? item.timeliness : 50,
          contentSuitability: typeof item.contentSuitability === "number" ? item.contentSuitability : 50,
          validationScore: typeof item.validationScore === "number" ? item.validationScore : 50,
        }))
        .filter(
          (item) => item.factualConfidence >= 40 && item.timeliness >= 30
        )
        .sort((a, b) => b.validationScore - a.validationScore);

      return validated;
    }
  } catch (err: any) {
    console.warn("[NewsScript/Validation] AI validation failed:", err.message);
  }

  // Fallback: use relevanceScore as validation
  return enrichedItems
    .map((item) => ({
      ...item,
      factualConfidence: Math.min(100, item.relevanceScore + 10),
      timeliness: 70,
      contentSuitability: 65,
      validationScore: Math.round((item.relevanceScore + 70 + 65) / 3),
    }))
    .sort((a, b) => b.validationScore - a.validationScore);
}

// ─── Agent 4: Script Generation Agent ────────────────────────────────
async function runNewsScriptGenAgent(
  openaiKey: string,
  validatedItems: ValidatedNewsItem[],
  context: AgentContext
): Promise<NewsScript[]> {
  const locLabel = locationLabel(context.location.location);
  const culture = context.location.culturalPreferences?.join(", ") || "general";
  const lang = context.location.contentLanguages?.[0] || "en";
  const platforms = context.location.localPlatforms?.slice(0, 3).join(", ") || "YouTube, Instagram";

  const top5 = validatedItems.slice(0, 5);

  const systemPrompt = `You are an expert short-form news script writer for ${locLabel}.
You create engaging 200-500 word scripts for social media platforms.
Every script must have four clear sections: Hook, Context, Body, CTA.
Adapt tone and cultural references for ${locLabel} audience.
Language: ${lang}. Cultural context: ${culture}.
Always respond with valid JSON only. No markdown.`;

  const userPrompt = `Generate one news script for each of these validated news items.
Target platforms: ${platforms}

News items:
${JSON.stringify(top5, null, 2)}

For each item, create a script with:
- id: unique string
- newsItemId: the item's id
- title: script title
- hook: opening hook (20-30 words, pattern interrupt, attention grabber)
- context: brief context (50-80 words, sets the scene)
- body: main content (100-300 words, value-packed, storytelling)
- cta: call to action (20-40 words, engagement driver)
- fullScript: hook + context + body + cta combined into one flowing script
- wordCount: total word count of fullScript (MUST be 200-500)
- estimatedDuration: seconds (assume 150 words/min speaking rate)
- platform: best platform for this script
- tone: "conversational" | "informative" | "high-energy" | "emotional" | "professional"
- language: "${lang}"

CRITICAL: Each fullScript MUST be between 200-500 words. Auto-trim if needed.
Return a JSON array. JSON only, no markdown.`;

  try {
    const raw = await callOpenAI(openaiKey, systemPrompt, userPrompt, 6000);
    const parsed = safeParseJSON<any[]>(raw);

    if (parsed && Array.isArray(parsed)) {
      return parsed.map((script) => {
        const fullScript = script.fullScript || `${script.hook || ""}\n\n${script.context || ""}\n\n${script.body || ""}\n\n${script.cta || ""}`;
        const words = fullScript.split(/\s+/).filter(Boolean);
        const wordCount = words.length;

        return {
          id: script.id || generateId(),
          newsItemId: script.newsItemId || "",
          title: script.title || "Untitled Script",
          hook: script.hook || "",
          context: script.context || "",
          body: script.body || "",
          cta: script.cta || "",
          fullScript: wordCount > 500 ? words.slice(0, 500).join(" ") : fullScript,
          wordCount: Math.min(wordCount, 500),
          estimatedDuration: script.estimatedDuration || Math.round((Math.min(wordCount, 500) / 150) * 60),
          platform: script.platform || "YouTube",
          tone: script.tone || "conversational",
          language: script.language || lang,
        };
      });
    }
  } catch (err: any) {
    console.warn("[NewsScript/ScriptGen] AI script generation failed:", err.message);
  }

  // Fallback: generate basic scripts from items
  return top5.map((item) => {
    const hook = `Breaking news that you need to know about: ${item.title}.`;
    const ctx = `Here's the context — ${item.summary}`;
    const body = `This story matters because it directly impacts how we think about ${item.category}. ${item.trendConnection || "Stay informed and ahead of the curve."} The implications are significant for anyone following ${item.keywords?.slice(0, 3).join(", ") || "current events"}.`;
    const cta = `What do you think about this? Drop your thoughts in the comments and share this with someone who needs to know. Follow for more daily updates!`;
    const fullScript = `${hook}\n\n${ctx}\n\n${body}\n\n${cta}`;

    return {
      id: generateId(),
      newsItemId: item.id,
      title: item.title,
      hook,
      context: ctx,
      body,
      cta,
      fullScript,
      wordCount: fullScript.split(/\s+/).filter(Boolean).length,
      estimatedDuration: Math.round((fullScript.split(/\s+/).filter(Boolean).length / 150) * 60),
      platform: "YouTube",
      tone: "conversational",
      language: lang,
    };
  });
}

// ─── Agent 5: Refinement Agent ───────────────────────────────────────
async function runRefinementAgent(
  openaiKey: string,
  scripts: NewsScript[],
  context: AgentContext
): Promise<RefinedNewsScript[]> {
  const locLabel = locationLabel(context.location.location);
  const culture = context.location.culturalPreferences?.join(", ") || "general";

  const systemPrompt = `You are a script refinement specialist for ${locLabel}.
You polish, improve, and score news scripts for maximum engagement.
Focus on: hook strength, redundancy removal, CTA power, cultural fit.
CRITICAL: Final scripts must be 200-500 words. Trim excess words.
Always respond with valid JSON only. No markdown.`;

  const userPrompt = `Refine and score these news scripts for ${locLabel} audience.
Cultural context: ${culture}

Scripts:
${JSON.stringify(scripts, null, 2)}

For each script:
1. Polish the fullScript: improve hook, remove redundancy, strengthen CTA
2. Auto-trim to 500 words max if over limit (hard cap)
3. Ensure minimum 200 words (expand if too short)
4. Score the refined version:
   - readabilityScore: 0-100
   - hookStrength: 0-100
   - engagementPotential: 0-100
5. Add refinementNotes: string[] (what you changed)
6. Set trimmed: boolean (true if word count was adjusted)
7. Set originalWordCount: number

Return all original fields plus the refinement fields. JSON array. No markdown.`;

  try {
    const raw = await callOpenAI(openaiKey, systemPrompt, userPrompt, 6000);
    const parsed = safeParseJSON<any[]>(raw);

    if (parsed && Array.isArray(parsed)) {
      return parsed.map((item, i) => {
        const original = scripts[i];
        const fullScript = item.fullScript || original?.fullScript || "";
        const words = fullScript.split(/\s+/).filter(Boolean);
        const trimmedScript = words.length > 500 ? words.slice(0, 500).join(" ") : fullScript;

        return {
          ...(original || {}),
          ...item,
          id: original?.id || item.id || generateId(),
          newsItemId: original?.newsItemId || item.newsItemId || "",
          fullScript: trimmedScript,
          wordCount: Math.min(words.length, 500),
          originalWordCount: typeof item.originalWordCount === "number" ? item.originalWordCount : original?.wordCount || words.length,
          trimmed: typeof item.trimmed === "boolean" ? item.trimmed : words.length > 500,
          refinementNotes: Array.isArray(item.refinementNotes) ? item.refinementNotes : ["Polished for engagement"],
          readabilityScore: typeof item.readabilityScore === "number" ? item.readabilityScore : 70,
          hookStrength: typeof item.hookStrength === "number" ? item.hookStrength : 65,
          engagementPotential: typeof item.engagementPotential === "number" ? item.engagementPotential : 60,
        };
      });
    }
  } catch (err: any) {
    console.warn("[NewsScript/Refinement] AI refinement failed:", err.message);
  }

  // Fallback: return scripts with default scores
  return scripts.map((script) => ({
    ...script,
    refinementNotes: ["Auto-scored (AI refinement unavailable)"],
    readabilityScore: 65,
    hookStrength: 60,
    engagementPotential: 55,
    originalWordCount: script.wordCount,
    trimmed: false,
  }));
}

// ─── Pipeline Orchestrator ───────────────────────────────────────────
export async function runNewsScriptPipeline(
  options: NewsScriptOptions
): Promise<NewsScriptResult> {
  const startTime = Date.now();
  const agentsExecuted: string[] = [];

  // Build location string and context
  const parts = [options.city, options.state, options.country].filter(Boolean);
  const locationStr = parts.join(", ") || options.country;
  const geo = parseLocationString(locationStr);

  // Override with precise data if we have country code
  if (options.country && options.country.length === 2) {
    geo.countryCode = options.country.toUpperCase();
    geo.country = getCountryName(options.country);
    if (options.state) {
      geo.state = getStateName(options.country, options.state);
    }
    if (options.city) {
      geo.city = options.city;
    }
  }

  const locationContext = buildLocationContext(geo);

  const context: AgentContext = {
    location: locationContext,
    creatorNiches: options.niches,
    creatorPlatforms: options.platforms,
    creatorLanguages: options.languages,
  };

  // Agent 1: Retrieval
  console.log("[NewsScript] Running Retrieval Agent...");
  let newsItems: NewsItem[];
  try {
    newsItems = await runRetrievalAgent(options.openaiKey, context, options.searchQuery);
    agentsExecuted.push("retrieval");
  } catch (err: any) {
    console.error("[NewsScript] Retrieval failed:", err.message);
    agentsExecuted.push("retrieval:failed");
    newsItems = getSimulatedNewsItems(geo.countryCode);
  }
  console.log(`[NewsScript] Retrieved ${newsItems.length} news items`);

  // Agent 2: Enrichment
  console.log("[NewsScript] Running Enrichment Agent...");
  let enrichedItems: EnrichedNewsItem[];
  try {
    enrichedItems = await runEnrichmentAgent(options.openaiKey, newsItems, context);
    agentsExecuted.push("enrichment");
  } catch (err: any) {
    console.error("[NewsScript] Enrichment failed:", err.message);
    agentsExecuted.push("enrichment:failed");
    enrichedItems = newsItems.map((item) => ({
      ...item,
      keywords: [],
      sentiment: "neutral" as const,
      targetAudience: "general",
      trendConnection: "",
      culturalRelevance: 50,
    }));
  }
  console.log(`[NewsScript] Enriched ${enrichedItems.length} items`);

  // Agent 3: Validation
  console.log("[NewsScript] Running Validation Agent...");
  let validatedItems: ValidatedNewsItem[];
  try {
    validatedItems = await runValidationAgent(options.openaiKey, enrichedItems, context);
    agentsExecuted.push("validation");
  } catch (err: any) {
    console.error("[NewsScript] Validation failed:", err.message);
    agentsExecuted.push("validation:failed");
    validatedItems = enrichedItems.map((item) => ({
      ...item,
      factualConfidence: 60,
      timeliness: 60,
      contentSuitability: 60,
      validationScore: 60,
    }));
  }
  console.log(`[NewsScript] Validated ${validatedItems.length} items`);

  // Agent 4: Script Generation
  console.log("[NewsScript] Running Script Generation Agent...");
  let scripts: NewsScript[];
  try {
    scripts = await runNewsScriptGenAgent(options.openaiKey, validatedItems, context);
    agentsExecuted.push("scriptGen");
  } catch (err: any) {
    console.error("[NewsScript] Script generation failed:", err.message);
    agentsExecuted.push("scriptGen:failed");
    scripts = [];
  }
  console.log(`[NewsScript] Generated ${scripts.length} scripts`);

  // Agent 5: Refinement
  console.log("[NewsScript] Running Refinement Agent...");
  let refinedScripts: RefinedNewsScript[];
  try {
    refinedScripts = scripts.length > 0
      ? await runRefinementAgent(options.openaiKey, scripts, context)
      : [];
    agentsExecuted.push("refinement");
  } catch (err: any) {
    console.error("[NewsScript] Refinement failed:", err.message);
    agentsExecuted.push("refinement:failed");
    refinedScripts = scripts.map((s) => ({
      ...s,
      refinementNotes: ["Refinement skipped"],
      readabilityScore: 50,
      hookStrength: 50,
      engagementPotential: 50,
      originalWordCount: s.wordCount,
      trimmed: false,
    }));
  }
  console.log(`[NewsScript] Refined ${refinedScripts.length} scripts`);

  return {
    location: locationContext,
    newsItems: validatedItems,
    scripts: refinedScripts,
    meta: {
      executionTimeMs: Date.now() - startTime,
      agentsExecuted,
    },
  };
}
