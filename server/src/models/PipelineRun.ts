import mongoose from "mongoose";

export interface IPipelineRun extends mongoose.Document {
  userId: mongoose.Types.ObjectId;
  location: object;
  trends: object[];
  signals?: object;
  ideas: object[];
  scripts: object[];
  predictions: object[];
  feedback?: object;
  meta: {
    mediaId?: string;
    transcriptLength?: number;
    wordCount?: number;
    mediaType?: string;
    mediaDuration?: number;
    executionTimeMs: number;
    agentsExecuted: string[];
  };
  status: "running" | "completed" | "failed";
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PipelineRunSchema = new mongoose.Schema<IPipelineRun>(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    location: { type: Object, default: {} },
    trends: { type: [Object], default: [] },
    signals: { type: Object },
    ideas: { type: [Object], default: [] },
    scripts: { type: [Object], default: [] },
    predictions: { type: [Object], default: [] },
    feedback: { type: Object },
    meta: {
      mediaId: { type: String },
      transcriptLength: { type: Number },
      wordCount: { type: Number },
      mediaType: { type: String },
      mediaDuration: { type: Number },
      executionTimeMs: { type: Number, default: 0 },
      agentsExecuted: { type: [String], default: [] },
    },
    status: { type: String, enum: ["running", "completed", "failed"], default: "running" },
    error: { type: String },
  },
  { timestamps: true }
);

PipelineRunSchema.index({ userId: 1, createdAt: -1 });
PipelineRunSchema.index({ status: 1 });

export const PipelineRun = mongoose.model<IPipelineRun>("PipelineRun", PipelineRunSchema);
