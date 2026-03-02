import mongoose from "mongoose";

export interface ISubscriptionPlan extends mongoose.Document {
  name: string;
  priceCents: number;
  interval: "month" | "year" | "one_time";
  features: string[];
  active: boolean;
}

const SubscriptionPlanSchema = new mongoose.Schema<ISubscriptionPlan>(
  {
    name: { type: String, required: true },
    priceCents: { type: Number, required: true, default: 0 },
    interval: { type: String, enum: ["month", "year", "one_time"], default: "month" },
    features: { type: [String], default: [] },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const SubscriptionPlan = mongoose.model<ISubscriptionPlan>("SubscriptionPlan", SubscriptionPlanSchema);
