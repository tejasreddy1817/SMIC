import { chatCompletion, safeParseJson } from "../utils/openai";
import { GeoLocation, LocationContext, AgentContext } from "./types";
import { buildLocationContext, parseLocationString, locationLabel } from "../services/location.service";

/**
 * Location & Map Agent (Agent 0 — Initializer)
 *
 * Responsible for:
 * - Parsing and normalizing geographic input
 * - Enriching with regional language, culture, and platform metadata
 * - Providing LocationContext to all downstream agents
 * - Optionally using AI to refine cultural/content preferences
 */
export async function runLocationAgent(
  openaiKey: string,
  locationInput: string | GeoLocation,
  opts?: { niches?: string[]; platforms?: string[]; languages?: string[] }
): Promise<AgentContext> {
  // 1. Parse location
  const geo: GeoLocation =
    typeof locationInput === "string" ? parseLocationString(locationInput) : locationInput;

  // 2. Build base context
  const locCtx = buildLocationContext(geo);
  const label = locationLabel(geo);

  // 3. AI-enhance: ask GPT to refine cultural preferences for the location
  const system = {
    role: "system",
    content: `You are a cultural intelligence agent. Given a location, return a JSON object that describes content creation context for that region. Output only JSON with these fields:
- culturalPreferences: string[] (5-8 cultural traits that influence content in this region)
- contentLanguages: string[] (BCP 47 codes of languages for content, ordered by popularity)
- localPlatforms: string[] (social media platforms popular in this region, ordered)
- contentTone: string (preferred content tone: e.g. "high-energy", "informative", "emotional")
- peakHours: string (best posting hours in local timezone)
- avoidTopics: string[] (culturally sensitive topics to avoid)`,
  };

  const user = {
    role: "user",
    content: `Location: ${label}\nCountry Code: ${geo.countryCode}\n${geo.state ? `State: ${geo.state}` : ""}${geo.city ? `\nCity: ${geo.city}` : ""}\nCreator niches: ${(opts?.niches || []).join(", ") || "general"}\nCreator platforms: ${(opts?.platforms || []).join(", ") || "all"}`,
  };

  try {
    const out = await chatCompletion(openaiKey, [system, user], { max_tokens: 600 });
    const message = out.choices?.[0]?.message?.content || "";
    const parsed = safeParseJson(message);

    if (parsed && typeof parsed === "object") {
      // Merge AI-enriched data with static defaults
      if (Array.isArray(parsed.culturalPreferences)) {
        locCtx.culturalPreferences = parsed.culturalPreferences;
      }
      if (Array.isArray(parsed.contentLanguages)) {
        locCtx.contentLanguages = parsed.contentLanguages;
      }
      if (Array.isArray(parsed.localPlatforms)) {
        locCtx.localPlatforms = parsed.localPlatforms;
      }
    }
  } catch (err: any) {
    console.warn(`[LocationAgent] AI enrichment failed for ${label}, using defaults:`, err.message);
  }

  // 4. Override with user-specified values if provided
  if (opts?.languages?.length) {
    locCtx.contentLanguages = opts.languages;
  }
  if (opts?.platforms?.length) {
    locCtx.localPlatforms = opts.platforms;
  }

  // 5. Build and return the full AgentContext
  return {
    location: locCtx,
    creatorNiches: opts?.niches,
    creatorPlatforms: opts?.platforms,
    creatorLanguages: opts?.languages,
  };
}
