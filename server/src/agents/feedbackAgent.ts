import { chatCompletion, safeParseJson } from "../utils/openai";
import { AgentContext, ContentPerformance, FeedbackInsight, FeedbackResult, PipelineResult } from "./types";

/**
 * Feedback Learning Agent (Agent 6)
 *
 * Post-publish performance ingestion and self-learning:
 * - Ingests content performance data (views, likes, shares, etc.)
 * - Compares predicted vs actual performance
 * - Generates actionable insights for improving future predictions
 * - Suggests weight adjustments for the Signals Agent
 * - Identifies effective and ineffective hook patterns
 * - Tracks platform timing effectiveness
 *
 * This agent is designed to improve the entire pipeline over time.
 */

export async function runFeedbackAgent(
  openaiKey: string,
  performanceData: ContentPerformance[],
  context?: AgentContext
): Promise<FeedbackResult> {
  if (!performanceData.length) {
    return {
      insights: [],
      modelAdjustments: {},
      overallAccuracy: 0,
      samplesAnalyzed: 0,
    };
  }

  const system = {
    role: "system",
    content: `You are a content performance analyst and machine learning feedback specialist. You analyze post-publish content performance data, compare predicted vs actual results, and generate actionable insights to improve future content predictions and recommendations. Be specific, data-driven, and actionable. Output only JSON.`,
  };

  const user = {
    role: "user",
    content: `Analyze the following content performance data and provide feedback insights.

Performance data (${performanceData.length} items):
${JSON.stringify(performanceData.map(p => ({
  contentId: p.contentId,
  platform: p.platform,
  publishedAt: p.publishedAt,
  views: p.metrics.views,
  likes: p.metrics.likes,
  comments: p.metrics.comments,
  shares: p.metrics.shares,
  saves: p.metrics.saves,
  watchTime: p.metrics.watchTime,
  ctr: p.metrics.clickThroughRate,
  predictedViral: p.predictedViralProbability,
  actualPerformance: p.actualPerformance,
})))}

Return a JSON object with:
{
  "insights": [
    {
      "category": "trend_accuracy" | "script_quality" | "hook_effectiveness" | "platform_fit" | "timing",
      "insight": "specific finding",
      "confidence": 0-100,
      "actionable": "what to do differently",
      "basedOnSamples": number
    }
  ],
  "modelAdjustments": {
    "trendWeightUpdates": { "category": weight_delta (-1 to 1) },
    "hookPatterns": { "effective": ["pattern1"], "ineffective": ["pattern1"] },
    "platformTimingHints": { "platform": "best time" },
    "nicheSaturation": { "niche": saturation_score 0-100 }
  },
  "overallAccuracy": 0-100 (how accurate were predictions),
  "samplesAnalyzed": number
}

Focus on:
1. Prediction accuracy: How well did viral probability predictions match reality?
2. Hook effectiveness: Which opening patterns performed best?
3. Platform fit: Which platforms delivered best for which content types?
4. Timing insights: Any patterns in publish timing vs performance?
5. Saturation signals: Which niches are oversaturated?`,
  };

  const out = await chatCompletion(openaiKey, [system, user], { max_tokens: 2000 });
  const message = out.choices?.[0]?.message?.content || "";
  const parsed = safeParseJson(message);

  if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
    return {
      insights: Array.isArray(parsed.insights)
        ? parsed.insights.map((i: any) => ({
            category: i.category || "trend_accuracy",
            insight: i.insight || "",
            confidence: Math.max(0, Math.min(100, Number(i.confidence) || 50)),
            actionable: i.actionable || "",
            basedOnSamples: Number(i.basedOnSamples) || performanceData.length,
          }))
        : [],
      modelAdjustments: {
        trendWeightUpdates: parsed.modelAdjustments?.trendWeightUpdates || undefined,
        hookPatterns: parsed.modelAdjustments?.hookPatterns || undefined,
        platformTimingHints: parsed.modelAdjustments?.platformTimingHints || undefined,
        nicheSaturation: parsed.modelAdjustments?.nicheSaturation || undefined,
      },
      overallAccuracy: Math.max(0, Math.min(100, Number(parsed.overallAccuracy) || 0)),
      samplesAnalyzed: performanceData.length,
    };
  }

  // Fallback: compute basic accuracy from available data
  console.warn("[FeedbackAgent] Failed to parse AI response, computing basic metrics");
  return computeFallbackFeedback(performanceData);
}

function computeFallbackFeedback(data: ContentPerformance[]): FeedbackResult {
  const withPredictions = data.filter((d) => d.predictedViralProbability != null && d.actualPerformance != null);

  const performanceMap: Record<string, number> = {
    viral: 90,
    above_average: 70,
    average: 50,
    below_average: 30,
    flop: 10,
  };

  let totalError = 0;
  for (const d of withPredictions) {
    const actual = performanceMap[d.actualPerformance!] || 50;
    const predicted = d.predictedViralProbability!;
    totalError += Math.abs(actual - predicted);
  }

  const accuracy = withPredictions.length > 0
    ? Math.round(100 - totalError / withPredictions.length)
    : 0;

  return {
    insights: [
      {
        category: "trend_accuracy",
        insight: `Analyzed ${data.length} content pieces. Prediction accuracy: ${accuracy}%.`,
        confidence: Math.min(90, data.length * 5),
        actionable: accuracy < 50
          ? "Consider adjusting trend weighting — predictions are significantly off."
          : "Predictions are reasonably accurate. Continue monitoring.",
        basedOnSamples: data.length,
      },
    ],
    modelAdjustments: {},
    overallAccuracy: Math.max(0, accuracy),
    samplesAnalyzed: data.length,
  };
}
