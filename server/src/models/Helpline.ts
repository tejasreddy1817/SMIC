import mongoose from "mongoose";

export interface IHelpline extends mongoose.Document {
  region: string; // locality identifier (city/zip)
  phoneNumber?: string;
  hours?: string;
  notes?: string;
  active: boolean;
}

const HelplineSchema = new mongoose.Schema<IHelpline>({
  region: { type: String, required: true, index: true },
  phoneNumber: String,
  hours: String,
  notes: String,
  active: { type: Boolean, default: true },
});

export const Helpline = mongoose.model<IHelpline>("Helpline", HelplineSchema);
