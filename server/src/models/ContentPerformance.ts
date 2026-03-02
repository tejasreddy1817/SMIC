import mongoose from "mongoose";

export interface IContentPerformance extends mongoose.Document {
  userId: mongoose.Types.ObjectId;
  pipelineRunId?: mongoose.Types.ObjectId;
  contentId: string;
  platform: string;
  publishedAt: Date;
  metrics: {
    views: number;
    likes: number;
    comments: number;
    shares: number;
    saves?: number;
    watchTime?: number;
    clickThroughRate?: number;
  };
  predictedViralProbability?: number;
  actualPerformance?: "viral" | "above_average" | "average" | "below_average" | "flop";
  createdAt: Date;
  updatedAt: Date;
}

const ContentPerformanceSchema = new mongoose.Schema<IContentPerformance>(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    pipelineRunId: { type: mongoose.Schema.Types.ObjectId, ref: "PipelineRun" },
    contentId: { type: String, required: true },
    platform: { type: String, required: true },
    publishedAt: { type: Date, required: true },
    metrics: {
      views: { type: Number, default: 0 },
      likes: { type: Number, default: 0 },
      comments: { type: Number, default: 0 },
      shares: { type: Number, default: 0 },
      saves: { type: Number },
      watchTime: { type: Number },
      clickThroughRate: { type: Number },
    },
    predictedViralProbability: { type: Number },
    actualPerformance: {
      type: String,
      enum: ["viral", "above_average", "average", "below_average", "flop"],
    },
  },
  { timestamps: true }
);

ContentPerformanceSchema.index({ userId: 1, createdAt: -1 });
ContentPerformanceSchema.index({ contentId: 1 });

export const ContentPerformance = mongoose.model<IContentPerformance>(
  "ContentPerformance",
  ContentPerformanceSchema
);
