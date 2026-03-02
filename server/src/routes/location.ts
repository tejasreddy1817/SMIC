import express from "express";
import { ensureAuth, ensurePermission, AuthRequest } from "../middleware/auth";
import { buildLocationContext, parseLocationString, getSupportedRegions, locationLabel } from "../services/location.service";
import { runLocationAgent } from "../agents/locationAgent";
import { getCountries, getStates, getCities } from "../data/geo-hierarchy";

const router = express.Router();
router.use(ensureAuth, ensurePermission("app:use"));

// GET /api/location/regions — Get supported regions for map UI
router.get("/regions", async (_req: AuthRequest, res) => {
  try {
    const regions = getSupportedRegions();
    res.json({ regions });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch regions" });
  }
});

// POST /api/location/resolve — Parse and enrich a location string
router.post("/resolve", async (req: AuthRequest, res) => {
  const { location } = req.body;
  if (!location || typeof location !== "string") {
    return res.status(400).json({ error: "location string is required" });
  }

  try {
    const geo = parseLocationString(location);
    const context = buildLocationContext(geo);
    res.json({
      label: locationLabel(geo),
      geo,
      context,
    });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to resolve location" });
  }
});

// POST /api/location/enrich — AI-enriched location context
router.post("/enrich", async (req: AuthRequest, res) => {
  const { location, niches, platforms, languages } = req.body;
  if (!location || typeof location !== "string") {
    return res.status(400).json({ error: "location string is required" });
  }

  const openaiKey = (req.headers["x-api-key"] as string) || process.env.OPENAI_API_KEY;
  if (!openaiKey) return res.status(400).json({ error: "No OpenAI key" });

  try {
    const agentContext = await runLocationAgent(openaiKey, location, {
      niches: Array.isArray(niches) ? niches : undefined,
      platforms: Array.isArray(platforms) ? platforms : undefined,
      languages: Array.isArray(languages) ? languages : undefined,
    });

    res.json({
      label: locationLabel(agentContext.location.location),
      context: agentContext,
    });
  } catch (err: any) {
    console.error("[location/enrich] Error:", err.message);
    res.status(500).json({ error: "Failed to enrich location" });
  }
});

// ─── Geo Hierarchy Endpoints (cascading Country→State→City) ────────

// GET /api/location/countries
router.get("/countries", async (_req: AuthRequest, res) => {
  try {
    res.json({ countries: getCountries() });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch countries" });
  }
});

// GET /api/location/states/:country
router.get("/states/:country", async (req: AuthRequest, res) => {
  try {
    const states = getStates(req.params.country);
    res.json({ states });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch states" });
  }
});

// GET /api/location/cities/:country/:state
router.get("/cities/:country/:state", async (req: AuthRequest, res) => {
  try {
    const cities = getCities(req.params.country, req.params.state);
    res.json({ cities });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch cities" });
  }
});

export default router;
