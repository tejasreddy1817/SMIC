import mongoose from "mongoose";

export interface ISegment {
  start: number;
  end: number;
  text: string;
}

export interface ITranscript extends mongoose.Document {
  mediaId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  fullText: string;
  segments: ISegment[];
  language?: string;
  duration?: number;
  wordCount: number;
  createdAt: Date;
}

const SegmentSchema = new mongoose.Schema<ISegment>(
  {
    start: { type: Number, required: true },
    end: { type: Number, required: true },
    text: { type: String, required: true },
  },
  { _id: false }
);

const TranscriptSchema = new mongoose.Schema<ITranscript>(
  {
    mediaId: { type: mongoose.Schema.Types.ObjectId, ref: "Media", required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    fullText: { type: String, required: true },
    segments: { type: [SegmentSchema], default: [] },
    language: { type: String },
    duration: { type: Number },
    wordCount: { type: Number, default: 0 },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

TranscriptSchema.index({ mediaId: 1 });
TranscriptSchema.index({ userId: 1 });

export const Transcript = mongoose.model<ITranscript>("Transcript", TranscriptSchema);
