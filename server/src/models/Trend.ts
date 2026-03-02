import mongoose from "mongoose";

export interface ITrend extends mongoose.Document {
  locality: string; // city/zip/neighborhood
  topic: string;
  score: number; // computed signal for trending
  signals: {
    mentions: number;
    velocity: number;
    engagement: number;
  };
  predictedPeak?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const TrendSchema = new mongoose.Schema<ITrend>(
  {
    locality: { type: String, required: true, index: true },
    topic: { type: String, required: true, index: true },
    score: { type: Number, default: 0 },
    signals: {
      mentions: { type: Number, default: 0 },
      velocity: { type: Number, default: 0 },
      engagement: { type: Number, default: 0 },
    },
    predictedPeak: Date,
  },
  { timestamps: true }
);

TrendSchema.index({ locality: 1, topic: -1 });

export const Trend = mongoose.model<ITrend>("Trend", TrendSchema);
