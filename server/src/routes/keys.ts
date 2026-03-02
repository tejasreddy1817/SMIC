import express from "express";
import { ensureAuth, ensurePermission, AuthRequest } from "../middleware/auth";
import { User } from "../models/User";

const router = express.Router();

router.use(ensureAuth, ensurePermission("keys:manage:self"));

router.post("/set", async (req: AuthRequest, res) => {
  const { openai, instagram, youtube } = req.body;
  const userId = req.userId!;
  await User.findByIdAndUpdate(userId, { $set: { metadata: { apiKeys: { openai, instagram, youtube } } } }, { upsert: true });
  res.json({ ok: true });
});

router.get("/get", async (req: AuthRequest, res) => {
  const userId = req.userId!;
  const user = await User.findById(userId);
  res.json({ apiKeys: user?.metadata?.apiKeys || {} });
});

export default router;
