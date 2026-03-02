import { chatCompletion, safeParseJson } from "../utils/openai";
import { Idea, Script, AgentContext } from "./types";
import { locationLabel } from "../services/location.service";

const MAX_IDEAS_PER_BATCH = 10;

/**
 * Script Agent (Agent 3 — Location-Aware)
 *
 * Transforms selected ideas into high-quality, ready-to-publish scripts.
 * Generates top 10 optimized scripts per idea.
 * Adapts scripts to regional language, platform-specific formats, and cultural tone.
 */
export async function runScriptAgent(
  openaiKey: string,
  ideas: Idea[],
  context?: AgentContext
): Promise<Script[]> {
  const scripts: Script[] = [];
  const capped = ideas.slice(0, MAX_IDEAS_PER_BATCH);
  const locLabel = context?.location ? locationLabel(context.location.location) : "Global";
  const languages = context?.location?.contentLanguages || ["en"];
  const culturalCtx = context?.location?.culturalPreferences?.join("; ") || "general";

  let transcriptHint = "";
  if (context?.transcript?.fullText) {
    transcriptHint = `\nReference transcript (match tone and adapt content):\n"${context.transcript.fullText.slice(0, 800)}"`;
  }

  for (const idea of capped) {
    const system = {
      role: "system",
      content: `You are an expert script writer for ${locLabel}. Create short-form social media scripts optimized for ${idea.platform}. Every script must have: a strong hook (first 3-5 seconds), clear narrative flow (hook → value → payoff → CTA), and platform-appropriate tone, length, and pacing. Adapt to regional language preferences and cultural context. Output only a JSON array.`,
    };

    const user = {
      role: "user",
      content: `Location: ${locLabel}
Cultural context: ${culturalCtx}
Content language: ${idea.language || languages[0] || "en"}
Platform: ${idea.platform}

Idea: ${JSON.stringify(idea)}${transcriptHint}

Produce exactly 10 scripts for this idea. Each script must be a JSON object with:
- id: unique string
- ideaId: "${idea.id}"
- platform: "${idea.platform}"
- tone: varied tones (conversational, authoritative, humorous, dramatic, inspirational, etc.)
- lengthSeconds: estimated duration (15-60 seconds)
- content: the full script text with clear sections
- hook: the opening hook text (first 3-5 seconds, pattern interrupt)
- structure: "hook_value_payoff_cta"
- language: "${idea.language || languages[0] || "en"}"
- rank: 1-10 (your quality ranking, 1 = best)

Vary tone across all 10. Adapt language and references to ${locLabel} audience.`,
    };

    const out = await chatCompletion(openaiKey, [system, user], { max_tokens: 2500 });
    const message = out.choices?.[0]?.message?.content || "";
    const parsed = safeParseJson(message);

    if (!Array.isArray(parsed)) {
      console.warn(`[ScriptAgent] Failed to parse scripts for idea ${idea.id}`);
      continue;
    }

    for (const p of parsed) {
      scripts.push({
        id: p.id || `script_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        ideaId: idea.id,
        platform: p.platform || idea.platform,
        tone: p.tone || "conversational",
        lengthSeconds: p.lengthSeconds || undefined,
        content: p.content || "",
        hook: p.hook || "",
        structure: p.structure || "hook_value_payoff_cta",
        language: p.language || idea.language || languages[0] || "en",
        rank: Number(p.rank) || undefined,
      });
    }
  }
  return scripts;
}
