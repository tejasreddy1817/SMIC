import mongoose from "mongoose";

export interface IMessage extends mongoose.Document {
  userId: string;
  role: "user" | "assistant";
  content: string;
  createdAt: Date;
}

const MessageSchema = new mongoose.Schema<IMessage>({
  userId: String,
  role: { type: String, enum: ["user", "assistant"] },
  content: String,
  createdAt: { type: Date, default: Date.now },
});

export const Message = mongoose.model<IMessage>("Message", MessageSchema);
