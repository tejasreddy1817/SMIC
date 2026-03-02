import { GeoLocation, LocationContext } from "../agents/types";

// ─── Platform popularity by region ──────────────────────────────────
const REGION_PLATFORMS: Record<string, string[]> = {
  IN: ["Instagram", "YouTube", "WhatsApp", "ShareChat", "Moj", "Josh"],
  US: ["Instagram", "YouTube", "TikTok", "X", "Threads"],
  BR: ["Instagram", "YouTube", "TikTok", "WhatsApp", "Kwai"],
  ID: ["Instagram", "YouTube", "TikTok", "WhatsApp"],
  JP: ["YouTube", "LINE", "X", "TikTok", "Instagram"],
  KR: ["YouTube", "Instagram", "KakaoStory", "Naver", "TikTok"],
  GB: ["Instagram", "YouTube", "TikTok", "X", "Threads"],
  DE: ["Instagram", "YouTube", "TikTok", "X"],
  NG: ["Instagram", "YouTube", "TikTok", "WhatsApp", "X"],
  default: ["Instagram", "YouTube", "TikTok", "X", "Google"],
};

// ─── Language defaults by country ───────────────────────────────────
const COUNTRY_LANGUAGES: Record<string, string[]> = {
  IN: ["hi", "en", "ta", "te", "bn", "mr", "gu", "kn", "ml"],
  US: ["en", "es"],
  BR: ["pt"],
  JP: ["ja"],
  KR: ["ko"],
  DE: ["de"],
  FR: ["fr"],
  ES: ["es"],
  IT: ["it"],
  RU: ["ru"],
  CN: ["zh"],
  SA: ["ar"],
  AE: ["ar", "en"],
  NG: ["en", "yo", "ig", "ha"],
  default: ["en"],
};

// ─── Cultural preference hints ──────────────────────────────────────
const CULTURAL_HINTS: Record<string, string[]> = {
  IN: ["Bollywood references", "cricket culture", "festival-driven content", "regional diversity", "family-centric narratives"],
  US: ["pop culture references", "fast-paced editing", "individual stories", "trending audio", "meme culture"],
  BR: ["music-driven content", "humor and satire", "football culture", "carnival aesthetics"],
  JP: ["anime references", "minimalist aesthetics", "respect for craft", "ASMR content"],
  KR: ["K-pop influences", "beauty standards", "mukbang culture", "variety show format"],
  NG: ["Afrobeats influence", "comedy skits", "Nollywood references", "motivational content"],
  default: ["universal humor", "relatable situations", "trending challenges"],
};

/**
 * Build a full LocationContext from a GeoLocation.
 * Enriches with platform, language, and cultural metadata.
 */
export function buildLocationContext(geo: GeoLocation): LocationContext {
  const code = geo.countryCode?.toUpperCase() || "US";

  return {
    location: {
      ...geo,
      countryCode: code,
    },
    culturalPreferences: CULTURAL_HINTS[code] || CULTURAL_HINTS.default,
    contentLanguages: geo.languages || COUNTRY_LANGUAGES[code] || COUNTRY_LANGUAGES.default,
    localPlatforms: REGION_PLATFORMS[code] || REGION_PLATFORMS.default,
  };
}

/**
 * Resolve a location string like "Mumbai, India" into a structured GeoLocation.
 * Uses a best-effort heuristic; production can swap in a geocoding API.
 */
export function parseLocationString(input: string): GeoLocation {
  const trimmed = input.trim();
  const parts = trimmed.split(",").map((p) => p.trim()).filter(Boolean);

  // Attempt country code resolution from common names
  const countryPart = parts[parts.length - 1] || trimmed;
  const code = resolveCountryCode(countryPart);

  if (parts.length >= 3) {
    return { city: parts[0], state: parts[1], country: parts[2], countryCode: code };
  }
  if (parts.length === 2) {
    // Could be "City, Country" or "State, Country"
    return { city: parts[0], country: parts[1], countryCode: code };
  }
  // Single value — treat as country
  return { country: trimmed, countryCode: code };
}

/** Build a human-readable label for a location */
export function locationLabel(geo: GeoLocation): string {
  const parts = [geo.city, geo.state, geo.country].filter(Boolean);
  return parts.join(", ") || "Global";
}

// ─── Country code lookup (common names) ─────────────────────────────
const COUNTRY_NAME_TO_CODE: Record<string, string> = {
  india: "IN", "united states": "US", usa: "US", "united kingdom": "GB", uk: "GB",
  brazil: "BR", japan: "JP", "south korea": "KR", korea: "KR", germany: "DE",
  france: "FR", spain: "ES", italy: "IT", russia: "RU", china: "CN",
  canada: "CA", australia: "AU", mexico: "MX", indonesia: "ID",
  nigeria: "NG", "south africa": "ZA", "saudi arabia": "SA", uae: "AE",
  "united arab emirates": "AE", pakistan: "PK", bangladesh: "BD",
  turkey: "TR", thailand: "TH", vietnam: "VN", philippines: "PH",
  egypt: "EG", argentina: "AR", colombia: "CO", malaysia: "MY",
  singapore: "SG", nepal: "NP", "sri lanka": "LK",
};

function resolveCountryCode(name: string): string {
  const lower = name.toLowerCase().trim();
  // Already an ISO code?
  if (/^[A-Z]{2}$/.test(name.trim())) return name.trim().toUpperCase();
  return COUNTRY_NAME_TO_CODE[lower] || "US";
}

/** Get supported locations for the map UI */
export function getSupportedRegions(): { code: string; name: string; platforms: string[] }[] {
  return Object.entries(REGION_PLATFORMS)
    .filter(([code]) => code !== "default")
    .map(([code, platforms]) => ({
      code,
      name: Object.entries(COUNTRY_NAME_TO_CODE).find(([, c]) => c === code)?.[0] || code,
      platforms,
    }));
}
