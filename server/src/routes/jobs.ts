import express from "express";
import { ensureAuth, ensurePermission, AuthRequest } from "../middleware/auth";
import { Job } from "../models/Job";

const router = express.Router();
router.use(ensureAuth, ensurePermission("app:use"));

function safeInt(val: any, defaultVal: number, min: number, max: number): number {
  const n = parseInt(val, 10);
  if (isNaN(n)) return defaultVal;
  return Math.min(Math.max(n, min), max);
}

// GET /api/jobs — List user's jobs
router.get("/", async (req: AuthRequest, res) => {
  try {
    const limit = safeInt(req.query.limit, 20, 1, 100);
    const status = typeof req.query.status === "string" ? req.query.status : undefined;

    const filter: any = { userId: req.userId };
    if (status && ["queued", "processing", "completed", "failed"].includes(status)) {
      filter.status = status;
    }

    const jobs = await Job.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .select("-result"); // Exclude large result payload in list view

    res.json({ jobs });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch jobs" });
  }
});

// GET /api/jobs/:id — Get single job with full result
router.get("/:id", async (req: AuthRequest, res) => {
  try {
    const job = await Job.findOne({ _id: req.params.id, userId: req.userId });
    if (!job) return res.status(404).json({ error: "Job not found" });
    res.json({ job });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch job" });
  }
});

// GET /api/jobs/:id/status — Lightweight status check (for polling)
router.get("/:id/status", async (req: AuthRequest, res) => {
  try {
    const job = await Job.findOne({ _id: req.params.id, userId: req.userId })
      .select("status progress error completedAt");
    if (!job) return res.status(404).json({ error: "Job not found" });
    res.json({
      status: job.status,
      progress: job.progress,
      error: job.error,
      completedAt: job.completedAt,
    });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch job status" });
  }
});

export default router;
