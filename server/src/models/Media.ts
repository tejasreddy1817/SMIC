import mongoose from "mongoose";

export interface IMedia extends mongoose.Document {
  userId: mongoose.Types.ObjectId;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  duration?: number;
  resolution?: string;
  s3Key: string;
  audioS3Key?: string;
  transcriptId?: mongoose.Types.ObjectId;
  status: "uploaded" | "processing" | "audio_extracted" | "transcribing" | "completed" | "failed";
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

const MediaSchema = new mongoose.Schema<IMedia>(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    originalName: { type: String, required: true },
    mimeType: { type: String, required: true },
    sizeBytes: { type: Number, required: true },
    duration: { type: Number },
    resolution: { type: String },
    s3Key: { type: String, required: true },
    audioS3Key: { type: String },
    transcriptId: { type: mongoose.Schema.Types.ObjectId, ref: "Transcript" },
    status: {
      type: String,
      enum: ["uploaded", "processing", "audio_extracted", "transcribing", "completed", "failed"],
      default: "uploaded",
    },
    error: { type: String },
  },
  { timestamps: true }
);

MediaSchema.index({ userId: 1, createdAt: -1 });
MediaSchema.index({ status: 1 });

export const Media = mongoose.model<IMedia>("Media", MediaSchema);
