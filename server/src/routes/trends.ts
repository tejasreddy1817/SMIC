import express from "express";
import { ensureAuth, ensurePermission, auditSensitive, AuthRequest } from "../middleware/auth";
import { Trend } from "../models/Trend";

const router = express.Router();

// submit a signal for a topic in a locality
router.post("/signal", ensureAuth, ensurePermission("trends:signal:write"), async (req: AuthRequest, res) => {
  const { locality, topic, mentions = 0, velocity = 0, engagement = 0 } = req.body;
  if (!locality || !topic) return res.status(400).json({ error: "Missing locality or topic" });

  const signals = { mentions: Number(mentions), velocity: Number(velocity), engagement: Number(engagement) };
  const score = signals.mentions * 0.5 + signals.velocity * 1.2 + signals.engagement * 0.8;

  let t = await Trend.findOne({ locality, topic });
  if (!t) {
    t = await Trend.create({ locality, topic, signals, score, predictedPeak: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3) });
  } else {
    t.signals.mentions += signals.mentions;
    t.signals.velocity = Math.max(t.signals.velocity, signals.velocity);
    t.signals.engagement += signals.engagement;
    t.score = t.signals.mentions * 0.5 + t.signals.velocity * 1.2 + t.signals.engagement * 0.8;
    const daysUntilPeak = Math.max(1, 7 - Math.round(t.signals.velocity));
    t.predictedPeak = new Date(Date.now() + daysUntilPeak * 24 * 60 * 60 * 1000);
    await t.save();
  }

  res.json(t);
});

// list trends for a locality
router.get("/", async (req, res) => {
  const locality = typeof req.query.locality === "string" ? req.query.locality : undefined;
  if (!locality) return res.status(400).json({ error: "locality required" });
  const limit = Math.min(Math.max(1, parseInt(req.query.limit as string, 10) || 20), 100);
  const items = await Trend.find({ locality }).sort({ score: -1 }).limit(limit);
  res.json(items);
});

// admin: recompute scores for all trends
router.post("/recompute", ensureAuth, ensurePermission("trends:recompute"), auditSensitive("trends:recompute"), async (req: AuthRequest, res) => {
  const all = await Trend.find({});
  for (const t of all) {
    t.score = t.signals.mentions * 0.5 + t.signals.velocity * 1.2 + t.signals.engagement * 0.8;
    await t.save();
  }
  res.json({ ok: true, count: all.length });
});

export default router;
