import express from "express";
import bcrypt from "bcrypt";
import { ensureAuth, ensurePermission, auditSensitive, AuthRequest } from "../middleware/auth";
import { User } from "../models/User";
import { AuditLog } from "../models/AuditLog";
import { Organization } from "../models/Organization";
import { logAudit } from "../services/audit.service";

const router = express.Router();

// Safe int parser with bounds
function safeInt(val: any, defaultVal: number, min: number, max: number): number {
  const n = parseInt(val, 10);
  if (isNaN(n)) return defaultVal;
  return Math.min(Math.max(n, min), max);
}

// Audit logs - read all (developer/founder)
router.get("/audit-logs", ensureAuth, ensurePermission("audit:read:any"), async (req: AuthRequest, res) => {
  const action = typeof req.query.action === "string" ? req.query.action : undefined;
  const limit = safeInt(req.query.limit, 50, 1, 200);
  const skip = safeInt(req.query.skip, 0, 0, 100000);

  const q: any = {};
  if (action) q.action = action;
  // Non-founder: scope to own org
  if (req.role !== "founder" && req.organizationId) {
    q.organizationId = req.organizationId;
  }
  const logs = await AuditLog.find(q)
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip)
    .populate("actor", "email role")
    .populate("target", "email role");
  res.json(logs);
});

// Audit logs - own actions only (staff)
router.get("/audit-logs/mine", ensureAuth, ensurePermission("audit:read:self"), async (req: AuthRequest, res) => {
  const limit = safeInt(req.query.limit, 50, 1, 200);
  const skip = safeInt(req.query.skip, 0, 0, 100000);

  const logs = await AuditLog.find({ actor: req.userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip);
  res.json(logs);
});

// Suspend user (staff/founder)
router.post("/suspend/:userId", ensureAuth, ensurePermission("user:suspend"), auditSensitive("user:suspend"), async (req: AuthRequest, res) => {
  const { userId } = req.params;
  const user = await User.findById(userId);
  if (!user) return res.status(404).json({ error: "User not found" });

  // Cannot suspend founders
  if (user.role === "founder") {
    return res.status(403).json({ error: "Cannot suspend a founder" });
  }

  // Cannot suspend yourself
  if (userId === req.userId) {
    return res.status(403).json({ error: "Cannot suspend yourself" });
  }

  user.suspended = true;
  await user.save();

  res.json({ ok: true, userId: user._id, suspended: true });
});

// Reactivate user (staff/founder)
router.post("/reactivate/:userId", ensureAuth, ensurePermission("user:reactivate"), auditSensitive("user:reactivate"), async (req: AuthRequest, res) => {
  const { userId } = req.params;
  const user = await User.findById(userId);
  if (!user) return res.status(404).json({ error: "User not found" });

  user.suspended = false;
  await user.save();

  res.json({ ok: true, userId: user._id, suspended: false });
});

// Reset user password (staff/founder)
router.post("/reset-password/:userId", ensureAuth, ensurePermission("user:reset_password"), auditSensitive("user:reset_password"), async (req: AuthRequest, res) => {
  const { userId } = req.params;
  const { newPassword } = req.body;
  if (!newPassword || typeof newPassword !== "string" || newPassword.length < 8) {
    return res.status(400).json({ error: "Password must be at least 8 characters" });
  }

  const user = await User.findById(userId);
  if (!user) return res.status(404).json({ error: "User not found" });

  // Cannot reset founder passwords unless you are a founder
  if (user.role === "founder" && req.role !== "founder") {
    return res.status(403).json({ error: "Cannot reset founder password" });
  }

  user.passwordHash = await bcrypt.hash(newPassword, 12);
  await user.save();

  res.json({ ok: true });
});

// Feature flags - read
router.get("/feature-flags", ensureAuth, ensurePermission("feature_flags:manage"), async (req: AuthRequest, res) => {
  // Feature flags are stored at the organization level
  if (!req.organizationId) {
    return res.json({ features: {} });
  }
  const org = await Organization.findById(req.organizationId);
  res.json({ features: org?.settings?.features || {} });
});

// Feature flags - update
router.put("/feature-flags", ensureAuth, ensurePermission("feature_flags:manage"), auditSensitive("feature_flags:update"), async (req: AuthRequest, res) => {
  const { features } = req.body;
  if (!features || typeof features !== "object" || Array.isArray(features)) {
    return res.status(400).json({ error: "features object required" });
  }

  if (!req.organizationId) {
    return res.status(400).json({ error: "Organization required" });
  }

  const org = await Organization.findById(req.organizationId);
  if (!org) return res.status(404).json({ error: "Organization not found" });

  org.settings.features = { ...org.settings.features, ...features };
  await org.save();

  res.json({ features: org.settings.features });
});

// System logs (developer/founder) - returns recent audit entries as a proxy for logs
router.get("/logs", ensureAuth, ensurePermission("logs:read"), async (req: AuthRequest, res) => {
  const limit = safeInt(req.query.limit, 100, 1, 500);
  const skip = safeInt(req.query.skip, 0, 0, 100000);

  const logs = await AuditLog.find({})
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip);
  res.json(logs);
});

// Metrics (developer/founder) - basic system metrics
router.get("/metrics", ensureAuth, ensurePermission("metrics:read"), async (req: AuthRequest, res) => {
  const totalUsers = await User.countDocuments();
  const activeUsers = await User.countDocuments({ suspended: false });
  const suspendedUsers = await User.countDocuments({ suspended: true });
  const totalOrgs = await Organization.countDocuments();

  const roleBreakdown = await User.aggregate([
    { $group: { _id: "$role", count: { $sum: 1 } } },
  ]);

  res.json({
    totalUsers,
    activeUsers,
    suspendedUsers,
    totalOrgs,
    roleBreakdown: roleBreakdown.reduce((acc: any, r: any) => {
      acc[r._id] = r.count;
      return acc;
    }, {}),
  });
});

export default router;
