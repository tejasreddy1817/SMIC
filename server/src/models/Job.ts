import mongoose from "mongoose";

export interface IJob extends mongoose.Document {
  bullJobId: string;
  queue: "mediaProcessing" | "transcription" | "agentPipeline";
  userId: mongoose.Types.ObjectId;
  mediaId?: mongoose.Types.ObjectId;
  status: "queued" | "processing" | "completed" | "failed";
  progress: number;
  result?: Record<string, any>;
  error?: string;
  createdAt: Date;
  completedAt?: Date;
}

const JobSchema = new mongoose.Schema<IJob>(
  {
    bullJobId: { type: String, required: true },
    queue: {
      type: String,
      enum: ["mediaProcessing", "transcription", "agentPipeline"],
      required: true,
    },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    mediaId: { type: mongoose.Schema.Types.ObjectId, ref: "Media" },
    status: {
      type: String,
      enum: ["queued", "processing", "completed", "failed"],
      default: "queued",
    },
    progress: { type: Number, default: 0 },
    result: { type: Object },
    error: { type: String },
    completedAt: { type: Date },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

JobSchema.index({ userId: 1, status: 1 });
JobSchema.index({ bullJobId: 1 });

export const Job = mongoose.model<IJob>("Job", JobSchema);
