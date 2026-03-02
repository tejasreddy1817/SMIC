import express from "express";
import { ensureAuth, ensurePermission, auditSensitive, AuthRequest } from "../middleware/auth";
import { Organization } from "../models/Organization";
import { User } from "../models/User";
import { logAudit } from "../services/audit.service";

const router = express.Router();

// Create organization (any authenticated user; creator becomes founder of that org)
router.post("/", ensureAuth, auditSensitive("org:create"), async (req: AuthRequest, res) => {
  const { name, slug } = req.body;
  if (!name || !slug) return res.status(400).json({ error: "name and slug required" });

  const existing = await Organization.findOne({ slug: slug.toLowerCase() });
  if (existing) return res.status(400).json({ error: "Slug already taken" });

  const org = await Organization.create({
    name,
    slug: slug.toLowerCase(),
    ownerId: req.userId,
  });

  // Assign user to the org and set role to founder
  await User.findByIdAndUpdate(req.userId, {
    organizationId: org._id,
    role: "founder",
  });

  res.json(org);
});

// Get current user's organization
router.get("/mine", ensureAuth, async (req: AuthRequest, res) => {
  if (!req.organizationId) {
    return res.status(404).json({ error: "No organization" });
  }
  const org = await Organization.findById(req.organizationId);
  if (!org) return res.status(404).json({ error: "Organization not found" });
  res.json(org);
});

// Get organization by ID (must be a member)
router.get("/:id", ensureAuth, async (req: AuthRequest, res) => {
  const { id } = req.params;
  const org = await Organization.findById(id);
  if (!org) return res.status(404).json({ error: "Not found" });

  // Only members or founders with wildcard can view
  if (req.organizationId !== String(org._id) && req.role !== "founder") {
    return res.status(403).json({ error: "Forbidden" });
  }
  res.json(org);
});

// Update organization settings (founder only via wildcard org:manage)
router.put("/:id", ensureAuth, ensurePermission("org:manage"), auditSensitive("org:update"), async (req: AuthRequest, res) => {
  const { id } = req.params;
  const org = await Organization.findById(id);
  if (!org) return res.status(404).json({ error: "Not found" });

  if (String(org.ownerId) !== req.userId && req.role !== "founder") {
    return res.status(403).json({ error: "Only the owner can update org settings" });
  }

  const { name, settings } = req.body;
  if (name) org.name = name;
  if (settings) {
    if (settings.maxMembers !== undefined) org.settings.maxMembers = settings.maxMembers;
    if (settings.allowedDomains) org.settings.allowedDomains = settings.allowedDomains;
    if (settings.features) org.settings.features = { ...org.settings.features, ...settings.features };
  }
  await org.save();
  res.json(org);
});

// Delete organization (founder only)
router.delete("/:id", ensureAuth, ensurePermission("org:delete"), auditSensitive("org:delete"), async (req: AuthRequest, res) => {
  const { id } = req.params;
  const org = await Organization.findById(id);
  if (!org) return res.status(404).json({ error: "Not found" });

  if (String(org.ownerId) !== req.userId) {
    return res.status(403).json({ error: "Only the owner can delete the organization" });
  }

  // Remove org reference from all members
  await User.updateMany({ organizationId: org._id }, { $set: { organizationId: null } });
  await org.deleteOne();

  res.json({ ok: true });
});

// Add member to organization
router.post("/:id/members", ensureAuth, ensurePermission("org:manage"), async (req: AuthRequest, res) => {
  const { id } = req.params;
  const { userId, role } = req.body;
  if (!userId) return res.status(400).json({ error: "userId required" });

  const org = await Organization.findById(id);
  if (!org) return res.status(404).json({ error: "Organization not found" });

  // Check member limit
  const memberCount = await User.countDocuments({ organizationId: org._id });
  if (memberCount >= org.settings.maxMembers) {
    return res.status(400).json({ error: "Organization member limit reached" });
  }

  const user = await User.findById(userId);
  if (!user) return res.status(404).json({ error: "User not found" });

  user.organizationId = org._id;
  if (role && ["user", "staff", "developer"].includes(role)) {
    user.role = role;
  }
  await user.save();

  await logAudit({
    actor: req.userId!,
    action: "org:member:add",
    target: userId,
    targetType: "user",
    organizationId: String(org._id),
  });

  res.json({ ok: true, user: { id: user._id, email: user.email, role: user.role } });
});

// Remove member from organization (founder only)
router.delete("/:id/members/:userId", ensureAuth, ensurePermission("org:manage"), async (req: AuthRequest, res) => {
  const { id, userId } = req.params;
  const org = await Organization.findById(id);
  if (!org) return res.status(404).json({ error: "Organization not found" });

  if (String(org.ownerId) !== req.userId) {
    return res.status(403).json({ error: "Only the owner can remove members" });
  }

  // Cannot remove the owner
  if (userId === String(org.ownerId)) {
    return res.status(400).json({ error: "Cannot remove the organization owner" });
  }

  await User.findByIdAndUpdate(userId, { $set: { organizationId: null, role: "user" } });

  await logAudit({
    actor: req.userId!,
    action: "org:member:remove",
    target: userId,
    targetType: "user",
    organizationId: String(org._id),
  });

  res.json({ ok: true });
});

// Transfer ownership (founder only)
router.post("/:id/transfer", ensureAuth, ensurePermission("org:transfer"), auditSensitive("org:transfer"), async (req: AuthRequest, res) => {
  const { id } = req.params;
  const { newOwnerId } = req.body;
  if (!newOwnerId) return res.status(400).json({ error: "newOwnerId required" });

  const org = await Organization.findById(id);
  if (!org) return res.status(404).json({ error: "Organization not found" });

  if (String(org.ownerId) !== req.userId) {
    return res.status(403).json({ error: "Only the current owner can transfer ownership" });
  }

  const newOwner = await User.findById(newOwnerId);
  if (!newOwner) return res.status(404).json({ error: "New owner not found" });
  if (String(newOwner.organizationId) !== id) {
    return res.status(400).json({ error: "New owner must be a member of this organization" });
  }

  // Transfer
  org.ownerId = newOwner._id;
  await org.save();

  // Update roles
  newOwner.role = "founder";
  await newOwner.save();

  // Demote previous owner to developer
  await User.findByIdAndUpdate(req.userId, { role: "developer" });

  res.json({ ok: true, newOwnerId: newOwner._id });
});

export default router;
