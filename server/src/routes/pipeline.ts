import express from "express";
import { ensureAuth, ensurePermission, AuthRequest } from "../middleware/auth";
import { runAutonomousPipeline, PipelineOptions } from "../agents/orchestrator";
import { runFeedbackAgent } from "../agents/feedbackAgent";
import { runLocationAgent } from "../agents/locationAgent";
import { runTrendsAgent } from "../agents/trendsAgent";
import { runSignalsAgent } from "../agents/signalsAgent";
import { runIdeasAgent } from "../agents/ideasAgent";
import { runScriptAgent } from "../agents/scriptAgent";
import { runPredictAgent } from "../agents/predictAgent";
import { runNewsScriptPipeline } from "../agents/newsScriptAgent";
import { searchByQuery } from "../agents/connectors";
import { chatCompletion, safeParseJson } from "../utils/openai";
import { Job } from "../models/Job";
import { Transcript } from "../models/Transcript";
import { PipelineRun } from "../models/PipelineRun";
import { ContentPerformance } from "../models/ContentPerformance";
import { addPipelineJob } from "../services/queue.service";

const router = express.Router();
router.use(ensureAuth, ensurePermission("app:use"));

// POST /api/pipeline/run — Run pipeline synchronously (for quick text-only runs)
router.post("/run", async (req: AuthRequest, res) => {
  const { location, text, niches, platforms, languages, maxIdeas } = req.body;
  const openaiKey = (req.headers["x-api-key"] as string) || process.env.OPENAI_API_KEY;
  if (!openaiKey) return res.status(400).json({ error: "No OpenAI key" });

  if (!location || typeof location !== "string") {
    return res.status(400).json({ error: "location is required (e.g. 'Mumbai, India')" });
  }

  // Create pipeline run record
  const pipelineRun = await PipelineRun.create({
    userId: req.userId,
    status: "running",
    meta: { executionTimeMs: 0, agentsExecuted: [] },
  });

  try {
    const opts: PipelineOptions = {
      openaiKey,
      location,
      niches: Array.isArray(niches) ? niches : undefined,
      platforms: Array.isArray(platforms) ? platforms : undefined,
      languages: Array.isArray(languages) ? languages : undefined,
      maxIdeas: typeof maxIdeas === "number" ? maxIdeas : undefined,
    };

    // If text is provided, inject it as transcript
    if (text && typeof text === "string") {
      opts.transcript = {
        fullText: text,
        wordCount: text.split(/\s+/).filter(Boolean).length,
      };
      opts.mediaType = "text";
    }

    const result = await runAutonomousPipeline(opts);

    // Persist pipeline results
    await PipelineRun.findByIdAndUpdate(pipelineRun._id, {
      location: result.location,
      trends: result.trends,
      signals: result.signals,
      ideas: result.ideas,
      scripts: result.scripts,
      predictions: result.predictions,
      meta: result.meta,
      status: "completed",
    });

    res.json({ ...result, pipelineRunId: pipelineRun._id });
  } catch (err: any) {
    const details = err.response?.data?.error?.message || err.message || "Unknown error";
    const status = err.response?.status;
    console.error("[pipeline/run] Error:", { message: details, status, stack: err.stack });
    await PipelineRun.findByIdAndUpdate(pipelineRun._id, {
      status: "failed",
      error: details,
    });
    res.status(500).json({
      error: "Pipeline execution failed",
      details,
      ...(status === 401 && { hint: "OpenAI API key may be invalid or expired" }),
      ...(status === 429 && { hint: "OpenAI rate limit exceeded — try again later" }),
    });
  }
});

// POST /api/pipeline/run/async — Queue pipeline as async job
router.post("/run/async", async (req: AuthRequest, res) => {
  const { location, text, mediaId, niches, platforms, languages } = req.body;

  if (!location || typeof location !== "string") {
    return res.status(400).json({ error: "location is required" });
  }

  try {
    // If mediaId provided, resolve transcript text
    let resolvedText = text || "";
    if (mediaId && !resolvedText) {
      const transcript = await Transcript.findOne({ mediaId });
      if (transcript) {
        resolvedText = transcript.fullText;
      }
    }

    if (!resolvedText && !mediaId) {
      return res.status(400).json({ error: "Either text or mediaId with transcript is required" });
    }

    const jobDoc = await Job.create({
      bullJobId: "pending",
      queue: "agentPipeline",
      userId: req.userId,
      mediaId: mediaId || undefined,
      status: "queued",
      progress: 0,
    });

    const bullJob = await addPipelineJob({
      mediaId,
      userId: req.userId!,
      text: resolvedText,
      jobDocId: jobDoc._id.toString(),
      location,
      creatorNiches: Array.isArray(niches) ? niches : undefined,
      creatorPlatforms: Array.isArray(platforms) ? platforms : undefined,
      creatorLanguages: Array.isArray(languages) ? languages : undefined,
    });

    await Job.findByIdAndUpdate(jobDoc._id, { bullJobId: String(bullJob.id) });

    res.status(202).json({ jobId: jobDoc._id, status: "queued" });
  } catch (err: any) {
    console.error("[pipeline/run/async] Error:", err.message);
    res.status(500).json({ error: "Failed to queue pipeline" });
  }
});

// GET /api/pipeline/runs — List user's pipeline runs
router.get("/runs", async (req: AuthRequest, res) => {
  const limit = Math.min(Number(req.query.limit) || 20, 100);
  const skip = Number(req.query.skip) || 0;

  const runs = await PipelineRun.find({ userId: req.userId })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .select("status meta.executionTimeMs meta.agentsExecuted location.location.country createdAt");

  const total = await PipelineRun.countDocuments({ userId: req.userId });
  res.json({ runs, total });
});

// GET /api/pipeline/runs/:id — Get specific pipeline run
router.get("/runs/:id", async (req: AuthRequest, res) => {
  const run = await PipelineRun.findById(req.params.id);
  if (!run) return res.status(404).json({ error: "Not found" });
  if (String(run.userId) !== req.userId) return res.status(403).json({ error: "Forbidden" });
  res.json(run);
});

// POST /api/pipeline/feedback — Submit content performance data and run Feedback Agent
router.post("/feedback", async (req: AuthRequest, res) => {
  const { performances } = req.body;
  const openaiKey = (req.headers["x-api-key"] as string) || process.env.OPENAI_API_KEY;
  if (!openaiKey) return res.status(400).json({ error: "No OpenAI key" });

  if (!Array.isArray(performances) || performances.length === 0) {
    return res.status(400).json({ error: "performances array is required" });
  }

  try {
    // Save performance data
    const docs = await ContentPerformance.insertMany(
      performances.map((p: any) => ({
        userId: req.userId,
        pipelineRunId: p.pipelineRunId,
        contentId: p.contentId,
        platform: p.platform,
        publishedAt: new Date(p.publishedAt),
        metrics: p.metrics || {},
        predictedViralProbability: p.predictedViralProbability,
        actualPerformance: p.actualPerformance,
      }))
    );

    // Run Feedback Agent on all user's performance data (last 100 entries)
    const allPerf = await ContentPerformance.find({ userId: req.userId })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    const feedbackResult = await runFeedbackAgent(
      openaiKey,
      allPerf.map((p: any) => ({
        contentId: p.contentId,
        platform: p.platform,
        publishedAt: p.publishedAt?.toISOString?.() || p.publishedAt,
        metrics: p.metrics,
        predictedViralProbability: p.predictedViralProbability,
        actualPerformance: p.actualPerformance,
      }))
    );

    res.json({ saved: docs.length, feedback: feedbackResult });
  } catch (err: any) {
    console.error("[pipeline/feedback] Error:", err.message);
    res.status(500).json({ error: "Feedback processing failed" });
  }
});

// GET /api/pipeline/stats — Get user's pipeline stats (for dashboard)
router.get("/stats", async (req: AuthRequest, res) => {
  try {
    const userId = req.userId;

    const [totalRuns, completedRuns, latestRun] = await Promise.all([
      PipelineRun.countDocuments({ userId }),
      PipelineRun.countDocuments({ userId, status: "completed" }),
      PipelineRun.findOne({ userId, status: "completed" })
        .sort({ createdAt: -1 })
        .select("trends ideas scripts predictions meta.executionTimeMs")
        .lean(),
    ]);

    // Aggregate totals from all completed runs
    const aggregation = await PipelineRun.aggregate([
      { $match: { userId: req.userId, status: "completed" } },
      {
        $group: {
          _id: null,
          totalTrends: { $sum: { $size: "$trends" } },
          totalIdeas: { $sum: { $size: "$ideas" } },
          totalScripts: { $sum: { $size: "$scripts" } },
          totalPredictions: { $sum: { $size: "$predictions" } },
        },
      },
    ]);

    const agg = aggregation[0] || { totalTrends: 0, totalIdeas: 0, totalScripts: 0, totalPredictions: 0 };

    res.json({
      totalRuns,
      completedRuns,
      totalTrends: agg.totalTrends,
      totalIdeas: agg.totalIdeas,
      totalScripts: agg.totalScripts,
      totalPredictions: agg.totalPredictions,
      latestRun: latestRun
        ? {
            trendsCount: (latestRun.trends as any[])?.length || 0,
            ideasCount: (latestRun.ideas as any[])?.length || 0,
            scriptsCount: (latestRun.scripts as any[])?.length || 0,
            predictionsCount: (latestRun.predictions as any[])?.length || 0,
            executionTimeMs: latestRun.meta?.executionTimeMs,
          }
        : null,
    });
  } catch (err: any) {
    console.error("[pipeline/stats] Error:", err.message);
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

// ─── News Script Pipeline ───────────────────────────────────────────
// POST /api/pipeline/news-script — Run 5-agent news script pipeline
router.post("/news-script", async (req: AuthRequest, res) => {
  const { country, state, city, niches, platforms, languages, searchQuery } = req.body;
  const openaiKey = (req.headers["x-api-key"] as string) || process.env.OPENAI_API_KEY;
  if (!openaiKey) return res.status(400).json({ error: "No OpenAI key" });

  if (!country || typeof country !== "string") {
    return res.status(400).json({ error: "country is required (e.g. 'IN', 'US')" });
  }

  try {
    const result = await runNewsScriptPipeline({
      openaiKey,
      country,
      state: typeof state === "string" ? state : undefined,
      city: typeof city === "string" ? city : undefined,
      niches: Array.isArray(niches) ? niches : undefined,
      platforms: Array.isArray(platforms) ? platforms : undefined,
      languages: Array.isArray(languages) ? languages : undefined,
      searchQuery: typeof searchQuery === "string" ? searchQuery : undefined,
    });

    res.json(result);
  } catch (err: any) {
    const details = err.response?.data?.error?.message || err.message || "Unknown error";
    const status = err.response?.status;
    console.error("[pipeline/news-script] Error:", { message: details, status });
    res.status(500).json({
      error: "News script pipeline failed",
      details,
      ...(status === 401 && { hint: "OpenAI API key may be invalid or expired" }),
      ...(status === 429 && { hint: "OpenAI rate limit exceeded — try again later" }),
    });
  }
});

// ─── Smart Search — Person / Topic / Location / Latest ──────────────
// POST /api/pipeline/search — Search across all sources for a person, topic, or event
router.post("/search", async (req: AuthRequest, res) => {
  const { query, location } = req.body;
  const openaiKey = (req.headers["x-api-key"] as string) || process.env.OPENAI_API_KEY;
  if (!openaiKey) return res.status(400).json({ error: "No OpenAI key" });

  if (!query || typeof query !== "string" || query.trim().length < 2) {
    return res.status(400).json({ error: "query is required (min 2 characters)" });
  }

  try {
    // 1. Resolve location context if provided
    let context;
    if (location && typeof location === "string") {
      context = await runLocationAgent(openaiKey, location);
    }
    const countryCode = context?.location?.location?.countryCode || undefined;
    const lang = context?.location?.contentLanguages?.[0] || "en";

    // 2. Search across all connectors
    const rawResults = await searchByQuery(query.trim(), countryCode, lang);

    // 3. Use AI to analyze, enrich, and rank search results
    const system = {
      role: "system",
      content: `You are a real-time news and trend intelligence analyst. Given search results about a person, topic, event, or location, analyze and rank them by relevance, recency, and importance. Add context about press conferences, latest updates, and breaking developments. Output only a JSON array.`,
    };

    const user = {
      role: "user",
      content: `Search query: "${query}"
${location ? `Location focus: ${location}` : ""}

Raw search results from YouTube, News, and Facebook:
${JSON.stringify(rawResults.slice(0, 20))}

Analyze and return a ranked JSON array. Each object must include:
- name: headline/title (concise)
- location: relevant location or "${location || "Global"}"
- platforms: string[] (source platforms)
- strength: number 0-100 (relevance to query)
- explanation: 1-2 sentence summary with latest context
- engagementVelocity: number 0-100
- crossPlatformPresence: number (platform count)
- recency: ISO timestamp
- category: one of "news", "press_conference", "interview", "viral_video", "topic", "update"
- sentiment: "positive" | "negative" | "neutral" | "mixed"
- keywords: string[] (3-5)

Prioritize: latest news > press conferences > interviews > updates > general.
If the query is a person, focus on their most recent activities, statements, and appearances.
If the query is a location/area, focus on local breaking news and updates.`,
    };

    let trends;
    try {
      const out = await chatCompletion(openaiKey, [system, user], { max_tokens: 2000 });
      const message = out.choices?.[0]?.message?.content || "";
      const parsed = safeParseJson(message);

      if (Array.isArray(parsed)) {
        trends = parsed.map((t: any) => ({
          name: t.name || "unknown",
          location: t.location || location || "Global",
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
      console.warn("[pipeline/search] AI ranking failed, using raw results:", err.message);
    }

    // Fallback: use raw results if AI failed
    if (!trends || !trends.length) {
      trends = rawResults.map((r) => ({
        name: r.name,
        location: r.location || location || "Global",
        platforms: r.platforms,
        strength: r.score,
        explanation: r.explanation,
        engagementVelocity: 0,
        crossPlatformPresence: r.platforms.length,
        recency: new Date().toISOString(),
        category: r.category || "topic",
        sentiment: "neutral",
        keywords: [],
      }));
    }

    res.json({
      query,
      location: location || null,
      trends,
      rawCount: rawResults.length,
      enrichedCount: trends.length,
    });
  } catch (err: any) {
    const details = err.response?.data?.error?.message || err.message || "Unknown error";
    console.error("[pipeline/search] Error:", details);
    res.status(500).json({ error: "Search failed", details });
  }
});

// ─── Step-by-step pipeline endpoints ────────────────────────────────
// These allow the frontend to run individual stages instead of the full pipeline.

// POST /api/pipeline/trends — Discover trends for a location
router.post("/trends", async (req: AuthRequest, res) => {
  const { location } = req.body;
  const openaiKey = (req.headers["x-api-key"] as string) || process.env.OPENAI_API_KEY;
  if (!openaiKey) return res.status(400).json({ error: "No OpenAI key" });
  if (!location) return res.status(400).json({ error: "location is required" });

  try {
    const context = await runLocationAgent(openaiKey, location);
    const trends = await runTrendsAgent(openaiKey, context);
    const signals = await runSignalsAgent(openaiKey, trends, context);
    const rankedTrends = signals.rankedTrends.length > 0 ? signals.rankedTrends : trends;
    res.json({ trends: rankedTrends, signals, location: context.location });
  } catch (err: any) {
    const details = err.response?.data?.error?.message || err.message || "Unknown error";
    console.error("[pipeline/trends] Error:", details);
    res.status(500).json({ error: "Trend discovery failed", details });
  }
});

// POST /api/pipeline/ideas — Generate ideas from provided trends
router.post("/ideas", async (req: AuthRequest, res) => {
  const { trends, location } = req.body;
  const openaiKey = (req.headers["x-api-key"] as string) || process.env.OPENAI_API_KEY;
  if (!openaiKey) return res.status(400).json({ error: "No OpenAI key" });
  if (!Array.isArray(trends) || !trends.length) return res.status(400).json({ error: "trends array is required" });

  try {
    const context = location ? await runLocationAgent(openaiKey, location) : undefined;
    const ideas = await runIdeasAgent(openaiKey, trends, context);
    res.json({ ideas });
  } catch (err: any) {
    const details = err.response?.data?.error?.message || err.message || "Unknown error";
    console.error("[pipeline/ideas] Error:", details);
    res.status(500).json({ error: "Idea generation failed", details });
  }
});

// POST /api/pipeline/scripts — Generate scripts from provided ideas
router.post("/scripts", async (req: AuthRequest, res) => {
  const { ideas, location } = req.body;
  const openaiKey = (req.headers["x-api-key"] as string) || process.env.OPENAI_API_KEY;
  if (!openaiKey) return res.status(400).json({ error: "No OpenAI key" });
  if (!Array.isArray(ideas) || !ideas.length) return res.status(400).json({ error: "ideas array is required" });

  try {
    const context = location ? await runLocationAgent(openaiKey, location) : undefined;
    const scripts = await runScriptAgent(openaiKey, ideas, context);
    res.json({ scripts });
  } catch (err: any) {
    const details = err.response?.data?.error?.message || err.message || "Unknown error";
    console.error("[pipeline/scripts] Error:", details);
    res.status(500).json({ error: "Script generation failed", details });
  }
});

// POST /api/pipeline/predict — Predict viral potential for provided scripts
router.post("/predict", async (req: AuthRequest, res) => {
  const { scripts, location } = req.body;
  const openaiKey = (req.headers["x-api-key"] as string) || process.env.OPENAI_API_KEY;
  if (!openaiKey) return res.status(400).json({ error: "No OpenAI key" });
  if (!Array.isArray(scripts) || !scripts.length) return res.status(400).json({ error: "scripts array is required" });

  try {
    const context = location ? await runLocationAgent(openaiKey, location) : undefined;
    const predictions = await runPredictAgent(openaiKey, scripts, context);
    res.json({ predictions });
  } catch (err: any) {
    const details = err.response?.data?.error?.message || err.message || "Unknown error";
    console.error("[pipeline/predict] Error:", details);
    res.status(500).json({ error: "Prediction failed", details });
  }
});

export default router;
