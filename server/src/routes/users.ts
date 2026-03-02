import express from "express";
import { ensureAuth, ensurePermission, AuthRequest } from "../middleware/auth";
import { User } from "../models/User";

const router = express.Router();

// Self profile read (any authenticated user)
router.get("/me", ensureAuth, async (req: AuthRequest, res) => {
  const u = await User.findById(req.userId).select("-passwordHash");
  if (!u) return res.status(404).json({ error: "Not found" });
  res.json(u);
});

// Staff and founders can list users. Password hash is excluded.
router.get("/", ensureAuth, ensurePermission("user:read:any"), async (req: AuthRequest, res) => {
  const role = typeof req.query.role === "string" ? req.query.role : undefined;
  const limit = Math.min(Math.max(parseInt(req.query.limit as string, 10) || 100, 1), 200);
  const skip = Math.max(parseInt(req.query.skip as string, 10) || 0, 0);

  const q: any = {};
  if (role && ["user", "staff", "developer", "founder"].includes(role)) {
    q.role = role;
  }
  // Non-founder roles can only see users in their own organization
  if (req.role !== "founder" && req.organizationId) {
    q.organizationId = req.organizationId;
  }
  const users = await User.find(q).select("-passwordHash").limit(limit).skip(skip);
  res.json(users);
});

// Get single user (staff/founder)
router.get("/:id", ensureAuth, ensurePermission("user:read:any"), async (req: AuthRequest, res) => {
  const { id } = req.params;
  const u = await User.findById(id).select("-passwordHash");
  if (!u) return res.status(404).json({ error: "Not found" });
  res.json(u);
});

export default router;
