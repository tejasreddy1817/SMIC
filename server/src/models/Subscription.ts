import mongoose from "mongoose";

export interface ISubscription extends mongoose.Document {
  userId: mongoose.Types.ObjectId;
  planId: mongoose.Types.ObjectId;
  status: "active" | "past_due" | "canceled" | "trialing";
  currentPeriodEnd?: Date;
  providerSubscriptionId?: string;
}

const SubscriptionSchema = new mongoose.Schema<ISubscription>({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  planId: { type: mongoose.Schema.Types.ObjectId, ref: "SubscriptionPlan", required: true },
  status: { type: String, enum: ["active", "past_due", "canceled", "trialing"], default: "active" },
  currentPeriodEnd: Date,
  providerSubscriptionId: String,
});

SubscriptionSchema.index({ userId: 1 });

export const Subscription = mongoose.model<ISubscription>("Subscription", SubscriptionSchema);
