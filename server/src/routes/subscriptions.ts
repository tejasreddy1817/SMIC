import express from "express";
import { ensureAuth, ensurePermission, auditSensitive, AuthRequest } from "../middleware/auth";
import { SubscriptionPlan } from "../models/SubscriptionPlan";
import { Subscription } from "../models/Subscription";

const router = express.Router();

router.get("/plans", async (req, res) => {
  const plans = await SubscriptionPlan.find({ active: true });
  res.json(plans);
});

// create subscription (mock, real provider integration should be added)
router.post("/subscribe", ensureAuth, ensurePermission("subscription:subscribe:self"), async (req: AuthRequest, res) => {
  const { planId } = req.body;
  if (!req.userId) return res.status(401).json({ error: "No user" });
  const plan = await SubscriptionPlan.findById(planId);
  if (!plan) return res.status(404).json({ error: "Plan not found" });
  const sub = await Subscription.create({ userId: req.userId, planId: plan._id, status: "active" });
  res.json(sub);
});

// admin: create plan
router.post("/plans", ensureAuth, ensurePermission("subscription:plan:manage"), auditSensitive("subscription:plan:create"), async (req: AuthRequest, res) => {
  const { name, priceCents, interval, features } = req.body;
  const plan = await SubscriptionPlan.create({ name, priceCents, interval, features });
  res.json(plan);
});

export default router;
