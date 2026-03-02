import express from "express";
import { ensureAuth, ensurePermission, ensureRole, AuthRequest } from "../middleware/auth";
import { chatCompletion } from "../utils/openai";
import { runAutonomousPipeline } from "../agents/orchestrator";
import { runTrendsAgent } from "../agents/trendsAgent";
import { runSignalsAgent } from "../agents/signalsAgent";
import { runIdeasAgent } from "../agents/ideasAgent";
import { runScriptAgent } from "../agents/scriptAgent";
import { runPredictAgent } from "../agents/predictAgent";
import { runLocationAgent } from "../agents/locationAgent";
import { runFeedbackAgent } from "../agents/feedbackAgent";

const router = express.Router();

router.use(ensureAuth);

const MAX_AGENTS = 10;

// ─── User-facing: full pipeline execution ──────────────────────────
// Requires app:use permission (all authenticated users)
router.post("/run", ensurePermission("app:use"), async (req: AuthRequest, res) => {
  const { agents, message } = req.body;
  const openaiKey = (req.headers["x-api-key"] as string) || process.env.OPENAI_API_KEY;
  if (!openaiKey) return res.status(400).json({ error: "No OpenAI key" });

  if (!Array.isArray(agents) || agents.length === 0) {
    return res.status(400).json({ error: "agents must be a non-empty array" });
  }
  if (agents.length > MAX_AGENTS) {
    return res.status(400).json({ error: `Max ${MAX_AGENTS} agents allowed` });
  }
  if (typeof message !== "string" || !message.trim()) {
    return res.status(400).json({ error: "message must be a non-empty string" });
  }

  try {
    const results: any = {};
    let lastMessage = message;
    for (const a of agents) {
      if (!a.systemPrompt || typeof a.systemPrompt !== "string") continue;
      const system = { role: "system", content: a.systemPrompt };
      const user = { role: "user", content: lastMessage };
      const out = await chatCompletion(openaiKey, [system, user], { max_tokens: 800 });
      const reply = out.choices?.[0]?.message || out;
      results[a.name || `agent_${Math.random()}`] = reply;
      lastMessage = reply?.content || lastMessage;
    }
    res.json({ results });
  } catch (e: any) {
    console.error("[agents/run] Error:", e.message);
    res.status(500).json({ error: "Agent execution failed" });
  }
});

// Autonomous pipeline: Location → Trends → Signals → Ideas → Scripts → Predict
router.post("/run/auto", ensurePermission("app:use"), async (req: AuthRequest, res) => {
  const openaiKey = (req.headers["x-api-key"] as string) || process.env.OPENAI_API_KEY;
  if (!openaiKey) return res.status(400).json({ error: "No OpenAI key" });

  const { location, niches, platforms, languages, text, maxIdeas } = req.body;

  try {
    const out = await runAutonomousPipeline({
      openaiKey,
      location: location || "US",
      niches: Array.isArray(niches) ? niches : undefined,
      platforms: Array.isArray(platforms) ? platforms : undefined,
      languages: Array.isArray(languages) ? languages : undefined,
      maxIdeas: typeof maxIdeas === "number" ? maxIdeas : undefined,
      transcript: text ? { fullText: text, wordCount: text.split(/\s+/).filter(Boolean).length } : undefined,
      mediaType: text ? "text" : undefined,
    });
    res.json(out);
  } catch (e: any) {
    console.error("[agents/run/auto] Error:", e.message);
    res.status(500).json({ error: "Pipeline execution failed" });
  }
});

// ─── Developer/Founder: individual agent execution (debug) ─────────
// Requires debug:read permission (developer + founder only)
const debugRouter = express.Router();
debugRouter.use(ensurePermission("debug:read"));

// Run individual agents for debugging/testing
debugRouter.post("/agent/:agentName", async (req: AuthRequest, res) => {
  const openaiKey = (req.headers["x-api-key"] as string) || process.env.OPENAI_API_KEY;
  if (!openaiKey) return res.status(400).json({ error: "No OpenAI key" });

  const { agentName } = req.params;
  const { input, context } = req.body;

  try {
    let result: any;

    switch (agentName) {
      case "location":
        result = await runLocationAgent(openaiKey, input?.location || "US", input);
        break;
      case "trends":
        result = await runTrendsAgent(openaiKey, context);
        break;
      case "signals":
        if (!input?.trends) return res.status(400).json({ error: "trends array required in input" });
        result = await runSignalsAgent(openaiKey, input.trends, context);
        break;
      case "ideas":
        if (!input?.trends) return res.status(400).json({ error: "trends array required in input" });
        result = await runIdeasAgent(openaiKey, input.trends, context);
        break;
      case "scripts":
        if (!input?.ideas) return res.status(400).json({ error: "ideas array required in input" });
        result = await runScriptAgent(openaiKey, input.ideas, context);
        break;
      case "predict":
        if (!input?.scripts) return res.status(400).json({ error: "scripts array required in input" });
        result = await runPredictAgent(openaiKey, input.scripts, context);
        break;
      case "feedback":
        if (!input?.performances) return res.status(400).json({ error: "performances array required in input" });
        result = await runFeedbackAgent(openaiKey, input.performances, context);
        break;
      default:
        return res.status(400).json({ error: `Unknown agent: ${agentName}. Available: location, trends, signals, ideas, scripts, predict, feedback` });
    }

    res.json({ agent: agentName, result, executedBy: req.userId, role: req.role });
  } catch (e: any) {
    console.error(`[agents/debug/${agentName}] Error:`, e.message);
    res.status(500).json({ error: `Agent ${agentName} execution failed: ${e.message}` });
  }
});

// List available agents and their status
debugRouter.get("/agents", (_req: AuthRequest, res) => {
  res.json({
    agents: [
      { name: "location", description: "Geographic context initialization", order: 0 },
      { name: "trends", description: "Multi-source trend discovery", order: 1 },
      { name: "signals", description: "Trend scoring & weighting", order: 2 },
      { name: "ideas", description: "Content idea generation", order: 3 },
      { name: "scripts", description: "Script writing with hooks", order: 4 },
      { name: "predict", description: "Viral probability estimation", order: 5 },
      { name: "feedback", description: "Post-publish performance learning", order: 6 },
    ],
  });
});

router.use("/debug", debugRouter);

export default router;
