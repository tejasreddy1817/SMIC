import express from "express";
import { ensureAuth, ensurePermission, AuthRequest } from "../middleware/auth";
import { CustomerServiceTicket } from "../models/CustomerServiceTicket";
import { chatCompletion } from "../utils/openai";

const router = express.Router();

// user creates ticket
router.post("/tickets", ensureAuth, ensurePermission("ticket:create:self"), async (req: AuthRequest, res) => {
  const { subject, description } = req.body;
  if (!req.userId) return res.status(401).json({ error: "No user" });
  const ticket = await CustomerServiceTicket.create({ userId: req.userId, subject, description });
  res.json(ticket);
});

// user lists their tickets
router.get("/tickets", ensureAuth, ensurePermission("ticket:read:self"), async (req: AuthRequest, res) => {
  if (!req.userId) return res.status(401).json({ error: "No user" });
  const tickets = await CustomerServiceTicket.find({ userId: req.userId });
  res.json(tickets);
});

// staff: list all open tickets
router.get("/admin/tickets", ensureAuth, ensurePermission("ticket:read:any"), async (req: AuthRequest, res) => {
  const tickets = await CustomerServiceTicket.find({ status: "open" }).sort({ createdAt: -1 });
  res.json(tickets);
});

// staff: update ticket (assign/resolve/add message)
router.post("/admin/tickets/:id", ensureAuth, ensurePermission("ticket:update:any"), async (req: AuthRequest, res) => {
  const { id } = req.params;
  const { action, message, assignedTo, status } = req.body;
  const ticket = await CustomerServiceTicket.findById(id);
  if (!ticket) return res.status(404).json({ error: "Not found" });
  if (action === "message" && message) {
    ticket.messages.push({ from: req.userId || "system", body: message, createdAt: new Date() } as any);
  }
  if (assignedTo) ticket.assignedTo = assignedTo;
  if (status) ticket.status = status;
  await ticket.save();
  res.json(ticket);
});

// staff: attempt to resolve ticket via agent bot (LLM)
router.post("/admin/tickets/:id/agent-solve", ensureAuth, ensurePermission("ticket:resolve:any"), async (req: AuthRequest, res) => {
  const { id } = req.params;
  const ticket = await CustomerServiceTicket.findById(id);
  if (!ticket) return res.status(404).json({ error: "Not found" });

  const openaiKey = (req.headers["x-api-key"] as string) || process.env.OPENAI_API_KEY;
  if (!openaiKey) return res.status(400).json({ error: "No OpenAI key" });

  const msgs: any[] = [
    { role: "system", content: "You are a customer support assistant. Provide a concise actionable resolution and suggested next steps." },
    { role: "user", content: `Ticket subject: ${ticket.subject}\nDescription: ${ticket.description}` },
  ];

  const last = (ticket.messages || []).slice(-10);
  for (const m of last) {
    msgs.push({ role: m.from === req.userId ? "user" : "assistant", content: m.body });
  }

  const out = await chatCompletion(openaiKey, msgs, { max_tokens: 800 });
  const reply = out.choices?.[0]?.message?.content || String(out);

  ticket.messages.push({ from: "agent", body: reply, createdAt: new Date() } as any);
  ticket.status = "resolved";
  await ticket.save();

  res.json({ ticket, resolution: reply });
});

export default router;
