import { chatCompletion, safeParseJson } from "../utils/openai";
import { Trend, Idea, AgentContext } from "./types";
import { locationLabel } from "../services/location.service";

/**
 * Ideas Agent (Agent 2 — Location-Aware)
 *
 * Generates creative, location-aware content ideas based on trending topics.
 * Supports multiple formats: reels, shorts, posts, long-form.
 * Supports styles: educational, entertaining, news-explainer, storytelling, opinion.
 */
export async function runIdeasAgent(
  openaiKey: string,
  trends: Trend[],
  context?: AgentContext
): Promise<Idea[]> {
  const locLabel = context?.location ? locationLabel(context.location.location) : "Global";
  const platforms = context?.location?.localPlatforms || ["Instagram", "YouTube", "TikTok"];
  const culturalCtx = context?.location?.culturalPreferences?.join("; ") || "general";
  const languages = context?.location?.contentLanguages || ["en"];

  let transcriptHint = "";
  if (context?.transcript?.fullText) {
    transcriptHint = `\n\nTranscript excerpt (use themes from this for ideas):\n"${context.transcript.fullText.slice(0, 1000)}"`;
  }

  const system = {
    role: "system",
    content: `You are a creative content strategist specializing in ${locLabel}. Generate platform-aware, culturally-relevant content ideas. Consider regional audience behavior, local language, and cultural context. Output only a JSON array.`,
  };

  const user = {
    role: "user",
    content: `Location: ${locLabel}
Popular platforms: ${platforms.join(", ")}
Cultural context: ${culturalCtx}
Content languages: ${languages.join(", ")}
Creator niches: ${context?.creatorNiches?.join(", ") || "general"}

Trends:
${JSON.stringify(trends)}${transcriptHint}

For each trend, produce 3-5 content ideas. Each idea must be a JSON object with:
- id: unique string
- trend: trend name this idea is based on
- platform: target platform (one of: ${platforms.join(", ")})
- title: catchy idea title
- description: 2-3 sentence explanation of the idea
- style: one of "educational", "entertaining", "news_explainer", "storytelling", "opinion"
- format: one of "reel", "short", "post", "long_form"
- creativityScore: 0-100
- executionEase: 0-100
- locationRelevance: 0-100 (how relevant to ${locLabel})
- language: primary language code for the content
- culturalNotes: brief note on cultural adaptation

Output a flat JSON array of all ideas.`,
  };

  const out = await chatCompletion(openaiKey, [system, user], { max_tokens: 2000 });
  const message = out.choices?.[0]?.message?.content || "";
  const parsed = safeParseJson(message);

  if (!Array.isArray(parsed)) {
    console.warn("[IdeasAgent] Failed to parse OpenAI response");
    return [];
  }

  return parsed.map((p: any, idx: number) => ({
    id: p.id || `idea_${idx}_${Date.now()}`,
    trend: p.trend || "",
    platform: p.platform || "",
    title: p.title || "",
    description: p.description || "",
    style: p.style || "entertaining",
    format: p.format || "reel",
    creativityScore: Math.max(0, Math.min(100, Number(p.creativityScore) || 50)),
    executionEase: Math.max(0, Math.min(100, Number(p.executionEase) || 50)),
    locationRelevance: Math.max(0, Math.min(100, Number(p.locationRelevance) || 50)),
    language: p.language || languages[0] || "en",
    culturalNotes: p.culturalNotes || "",
  }));
}
