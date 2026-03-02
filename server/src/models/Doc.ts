import mongoose from "mongoose";

export interface IDoc extends mongoose.Document {
  title: string;
  content: string;
  embedding: number[];
  metadata?: Record<string, any>;
}

const DocSchema = new mongoose.Schema<IDoc>({
  title: String,
  content: String,
  embedding: { type: [Number], index: true },
  metadata: { type: Object, default: {} },
});

export const Doc = mongoose.model<IDoc>("Doc", DocSchema);
