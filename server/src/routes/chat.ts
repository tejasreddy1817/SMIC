import express from "express";
import { ensureAuth, ensurePermission, AuthRequest } from "../middleware/auth";
import { Message } from "../models/Message";
import { chatCompletion } from "../utils/openai";

const router = express.Router();

router.use(ensureAuth, ensurePermission("app:use"));

// Save chat messages
router.post("/message", async (req: AuthRequest, res) => {
  const { role, content } = req.body;
  const userId = req.userId!;
  const msg = await Message.create({ userId, role, content });
  res.json(msg);
});

// Get chat history
router.get("/history", async (req: AuthRequest, res) => {
  const userId = req.userId!;
  const messages = await Message.find({ userId }).sort({ createdAt: 1 });
  res.json(messages);
});

// Send message (save + get LLM response)
router.post("/chat", async (req: AuthRequest, res) => {
  const { content } = req.body;
  const userId = req.userId!;
  const openaiKey = (req.headers["x-api-key"] as string) || process.env.OPENAI_API_KEY;
  if (!openaiKey) return res.status(400).json({ error: "No OpenAI key" });

  // Save user message
  await Message.create({ userId, role: "user", content });

  // Get last 10 messages for context
  const history = await Message.find({ userId }).sort({ createdAt: -1 }).limit(10);
  const msgs = history
    .reverse()
    .map((m) => ({ role: m.role === "user" ? "user" : "assistant", content: m.content }));

  // Call LLM
  const system = { role: "system", content: "You are a helpful assistant for SMIC Pro." };
  const out = await chatCompletion(openaiKey, [system, ...msgs], { max_tokens: 800 });
  const reply = out.choices?.[0]?.message?.content || out;

  // Save assistant response
  const assistantMsg = await Message.create({ userId, role: "assistant", content: reply });
  res.json({ message: assistantMsg });
});

export default router;
