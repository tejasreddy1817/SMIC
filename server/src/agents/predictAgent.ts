import { chatCompletion, safeParseJson } from "../utils/openai";
import { Script, Prediction, AgentContext } from "./types";
import { locationLabel } from "../services/location.service";

const MAX_SCRIPTS_PER_BATCH = 20;

/**
 * Predict Agent (Agent 4 — Location-Aware)
 *
 * Estimates viral potential of generated content for a specific location.
 * Analyzes: trend momentum, topic saturation, idea originality,
 *           script quality, hook strength, platform-specific engagement.
 * Predictions are probabilistic, explainable, and non-deterministic.
 */
export async function runPredictAgent(
  openaiKey: string,
  scripts: Script[],
  context?: AgentContext
): Promise<Prediction[]> {
  const preds: Prediction[] = [];
  const capped = scripts.slice(0, MAX_SCRIPTS_PER_BATCH);
  const locLabel = context?.location ? locationLabel(context.location.location) : "Global";
  const culturalCtx = context?.location?.culturalPreferences?.join("; ") || "general";
  const platforms = context?.location?.localPlatforms || ["Instagram", "YouTube"];

  for (const s of capped) {
    const system = {
      role: "system",
      content: `You are a social media performance analyst specializing in ${locLabel}. Given a script, analyze its viral potential for the ${locLabel} market. Consider location-based trend momentum, topic saturation in the region, idea originality, script quality, hook strength, and platform-specific engagement patterns. Your predictions must be probabilistic, explainable, and non-deterministic. Output only JSON.`,
    };

    const user = {
      role: "user",
      content: `Location: ${locLabel}
Cultural context: ${culturalCtx}
Popular platforms in region: ${platforms.join(", ")}

Script: ${JSON.stringify(s)}

Analyze and provide a JSON object with:
- scriptId: "${s.id}"
- viralProbability: 0-100 (percentage chance of going viral in ${locLabel})
- confidence: 0-100 (your confidence in this prediction)
- explanation: 2-3 sentences explaining the prediction
- suggestions: string[] (3-5 actionable improvements)
- factors: {
    trendMomentum: 0-100 (current trend strength in the region),
    topicSaturation: 0-100 (how saturated this topic is),
    ideaOriginality: 0-100 (uniqueness of the approach),
    scriptQuality: 0-100 (writing quality and flow),
    hookStrength: 0-100 (stopping power of the hook),
    platformFit: 0-100 (how well it fits ${s.platform} in ${locLabel})
  }`,
    };

    const out = await chatCompletion(openaiKey, [system, user], { max_tokens: 600 });
    const message = out.choices?.[0]?.message?.content || "";
    const p = safeParseJson(message);

    if (p && typeof p === "object" && !Array.isArray(p)) {
      const factors = p.factors || {};
      preds.push({
        scriptId: s.id,
        viralProbability: Math.max(0, Math.min(100, Number(p.viralProbability) || 0)),
        confidence: Math.max(0, Math.min(100, Number(p.confidence) || 50)),
        explanation: p.explanation || "",
        suggestions: Array.isArray(p.suggestions) ? p.suggestions : [],
        factors: {
          trendMomentum: Math.max(0, Math.min(100, Number(factors.trendMomentum) || 0)),
          topicSaturation: Math.max(0, Math.min(100, Number(factors.topicSaturation) || 0)),
          ideaOriginality: Math.max(0, Math.min(100, Number(factors.ideaOriginality) || 0)),
          scriptQuality: Math.max(0, Math.min(100, Number(factors.scriptQuality) || 0)),
          hookStrength: Math.max(0, Math.min(100, Number(factors.hookStrength) || 0)),
          platformFit: Math.max(0, Math.min(100, Number(factors.platformFit) || 0)),
        },
      });
    } else {
      console.warn(`[PredictAgent] Failed to parse prediction for script ${s.id}`);
      preds.push({
        scriptId: s.id,
        viralProbability: 0,
        confidence: 30,
        explanation: "Prediction parsing failed",
        suggestions: [],
      });
    }
  }
  return preds;
}
