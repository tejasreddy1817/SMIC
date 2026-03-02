import express from "express";
import { ensureAuth, ensurePermission, AuthRequest } from "../middleware/auth";
import { Doc } from "../models/Doc";
import { createEmbedding, chatCompletion } from "../utils/openai";

const router = express.Router();

router.use(ensureAuth, ensurePermission("app:use"));

router.post("/upsert", async (req: AuthRequest, res) => {
  const { docs } = req.body; // [{title, content, metadata}]
  const userKeys = req.headers["x-api-key"] as string | undefined;
  const openaiKey = userKeys || process.env.OPENAI_API_KEY;
  if (!openaiKey) return res.status(400).json({ error: "No OpenAI key" });

  const created: any[] = [];
  for (const d of docs) {
    const embedding = await createEmbedding(openaiKey, d.content);
    const doc = await Doc.create({ title: d.title, content: d.content, embedding, metadata: d.metadata || {} });
    created.push(doc);
  }
  res.json({ created });
});

function cosine(a: number[], b: number[]) {
  const dot = a.reduce((s, v, i) => s + v * (b[i] || 0), 0);
  const na = Math.sqrt(a.reduce((s, v) => s + v * v, 0));
  const nb = Math.sqrt(b.reduce((s, v) => s + v * v, 0));
  return dot / (na * nb + 1e-8);
}

router.post("/query", async (req: AuthRequest, res) => {
  const { query, topk = 4 } = req.body;
  const openaiKey = (req.headers["x-api-key"] as string) || process.env.OPENAI_API_KEY;
  if (!openaiKey) return res.status(400).json({ error: "No OpenAI key" });

  const qEmb = await createEmbedding(openaiKey, query);
  const all = await Doc.find().lean();
  const scored = all.map((d: any) => ({ doc: d, score: cosine(qEmb, d.embedding || []) }));
  scored.sort((a: any, b: any) => b.score - a.score);
  const top = scored.slice(0, topk).map((s: any) => s.doc);

  // Build prompt
  const system = { role: "system", content: "You are a helpful assistant. Use the provided documents to answer." };
  const user = { role: "user", content: `Query: ${query}\n\nContext:\n${top.map((t: any) => t.content).join('\n---\n')}` };
  const out = await chatCompletion(openaiKey, [system, user], { max_tokens: 600 });
  res.json({ answer: out.choices?.[0]?.message || out });
});

export default router;
