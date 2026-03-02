import express from "express";
import { ensureAuth, ensurePermission, AuthRequest } from "../middleware/auth";
import { Helpline } from "../models/Helpline";

const router = express.Router();

// list helplines, optionally filter by region
router.get("/", async (req, res) => {
  const { region } = req.query;
  const q: any = {};
  if (region) q.region = String(region);
  const items = await Helpline.find(q).sort({ region: 1 });
  res.json(items);
});

// create or update helpline (staff/founder via permission)
router.post("/", ensureAuth, ensurePermission("helpline:manage"), async (req: AuthRequest, res) => {
  const { region, phoneNumber, hours, notes, active } = req.body;
  if (!region) return res.status(400).json({ error: "region required" });
  let h = await Helpline.findOne({ region });
  if (!h) {
    h = await Helpline.create({ region, phoneNumber, hours, notes, active: active !== false });
  } else {
    h.phoneNumber = phoneNumber ?? h.phoneNumber;
    h.hours = hours ?? h.hours;
    h.notes = notes ?? h.notes;
    if (typeof active === "boolean") h.active = active;
    await h.save();
  }
  res.json(h);
});

// update by id
router.put("/:id", ensureAuth, ensurePermission("helpline:manage"), async (req: AuthRequest, res) => {
  const { id } = req.params;
  const helpline = await Helpline.findById(id);
  if (!helpline) return res.status(404).json({ error: "Not found" });
  const { phoneNumber, hours, notes, active } = req.body;
  helpline.phoneNumber = phoneNumber ?? helpline.phoneNumber;
  helpline.hours = hours ?? helpline.hours;
  helpline.notes = notes ?? helpline.notes;
  if (typeof active === "boolean") helpline.active = active;
  await helpline.save();
  res.json(helpline);
});

export default router;
