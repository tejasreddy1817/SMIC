import mongoose from "mongoose";

export interface IOAuthState extends mongoose.Document {
  state: string;
  createdAt: Date;
  redirectUri?: string;
  action?: "login" | "link";
  userId?: mongoose.Types.ObjectId;
}

const OAuthStateSchema = new mongoose.Schema<IOAuthState>(
  {
    state: { type: String, required: true, unique: true },
    redirectUri: { type: String },
    action: { type: String, enum: ["login", "link"], default: "login" },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

OAuthStateSchema.index({ state: 1 });

export const OAuthState = mongoose.model<IOAuthState>("OAuthState", OAuthStateSchema);
