import { runLocationAgent } from "./locationAgent";
import { runTrendsAgent } from "./trendsAgent";
import { runSignalsAgent } from "./signalsAgent";
import { runIdeasAgent } from "./ideasAgent";
import { runScriptAgent } from "./scriptAgent";
import { runPredictAgent } from "./predictAgent";
import { AgentContext, GeoLocation, PipelineResult, Trend, Idea, Script, SignalsResult } from "./types";

export interface PipelineOptions {
  openaiKey?: string;
  location?: string | GeoLocation;
  niches?: string[];
  platforms?: string[];
  languages?: string[];
  transcript?: {
    fullText: string;
    segments?: { start: number; end: number; text: string }[];
    language?: string;
    duration?: number;
    wordCount?: number;
  };
  mediaType?: "video" | "audio" | "text";
  mediaDuration?: number;
  maxIdeas?: number;
}

/**
 * Full chained pipeline:
 * Location → Trends → Signals → Ideas → Scripts → Predict
 *
 * All agents receive the shared AgentContext including location,
 * transcript data, and creator preferences.
 *
 * Feedback Agent runs separately via /api/pipeline/feedback endpoint.
 */
export async function runAutonomousPipeline(
  openaiKeyOrOpts?: string | PipelineOptions
): Promise<PipelineResult> {
  const startTime = Date.now();
  const agentsExecuted: string[] = [];

  // Normalize arguments
  let opts: PipelineOptions;
  if (typeof openaiKeyOrOpts === "string") {
    opts = { openaiKey: openaiKeyOrOpts };
  } else {
    opts = openaiKeyOrOpts || {};
  }

  const key = opts.openaiKey || (process.env.OPENAI_API_KEY as string);
  if (!key) throw new Error("OpenAI key required");

  // 0. Location Agent — initialize geographic context
  const context: AgentContext = await runLocationAgent(key, opts.location || "US", {
    niches: opts.niches,
    platforms: opts.platforms,
    languages: opts.languages,
  });
  agentsExecuted.push("location");

  // Attach transcript if provided
  if (opts.transcript) {
    context.transcript = opts.transcript;
  }
  if (opts.mediaType) context.mediaType = opts.mediaType;
  if (opts.mediaDuration) context.mediaDuration = opts.mediaDuration;

  // 1. Trends Agent — discover location-specific trends
  let trends: Trend[] = [];
  try {
    trends = await runTrendsAgent(key, context);
    agentsExecuted.push("trends");
  } catch (err: any) {
    console.error("[Pipeline] Trends Agent failed:", err.message);
    agentsExecuted.push("trends:failed");
  }

  if (!trends.length) {
    console.warn("[Pipeline] No trends discovered — pipeline will proceed with empty data");
  }

  // 2. Signals & Weighting Agent — score and re-rank trends
  let signalsResult: SignalsResult = { signals: [], rankedTrends: [] };
  try {
    signalsResult = await runSignalsAgent(key, trends, context);
    agentsExecuted.push("signals");
  } catch (err: any) {
    console.error("[Pipeline] Signals Agent failed:", err.message);
    agentsExecuted.push("signals:failed");
  }

  // Use signal-ranked trends for downstream agents
  const rankedTrends = signalsResult.rankedTrends.length > 0
    ? signalsResult.rankedTrends
    : trends;

  // 3. Ideas Agent — generate location-aware content ideas from weighted trends
  let ideas: Idea[] = [];
  try {
    ideas = await runIdeasAgent(key, rankedTrends, context);
    agentsExecuted.push("ideas");
  } catch (err: any) {
    console.error("[Pipeline] Ideas Agent failed:", err.message);
    agentsExecuted.push("ideas:failed");
  }

  // Rank and select top ideas
  const maxIdeas = opts.maxIdeas || 5;
  const ranked = ideas
    .sort((a, b) => {
      const locDiff = (b.locationRelevance || 0) - (a.locationRelevance || 0);
      if (locDiff !== 0) return locDiff;
      return b.creativityScore - a.creativityScore;
    })
    .slice(0, maxIdeas);

  // 4. Script Agent — generate top 10 scripts per idea
  let scripts: Script[] = [];
  try {
    scripts = await runScriptAgent(key, ranked, context);
    agentsExecuted.push("scripts");
  } catch (err: any) {
    console.error("[Pipeline] Scripts Agent failed:", err.message);
    agentsExecuted.push("scripts:failed");
  }

  // 5. Predict Agent — estimate viral potential
  let predictions: any[] = [];
  try {
    predictions = await runPredictAgent(key, scripts, context);
    agentsExecuted.push("predict");
  } catch (err: any) {
    console.error("[Pipeline] Predict Agent failed:", err.message);
    agentsExecuted.push("predict:failed");
  }

  const executionTimeMs = Date.now() - startTime;

  return {
    location: context.location,
    trends: rankedTrends,
    signals: signalsResult,
    ideas: ranked,
    scripts,
    predictions,
    meta: {
      mediaId: undefined,
      transcriptLength: opts.transcript?.fullText?.length,
      wordCount: opts.transcript?.wordCount,
      mediaType: opts.mediaType,
      mediaDuration: opts.mediaDuration,
      executionTimeMs,
      agentsExecuted,
    },
  };
}
