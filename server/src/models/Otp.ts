import mongoose from "mongoose";

export interface IOtp extends mongoose.Document {
  userId: mongoose.Types.ObjectId; // the target user who will use the OTP
  code: string;
  createdBy?: mongoose.Types.ObjectId; // staff who issued it
  expiresAt: Date;
  used: boolean;
  createdAt: Date;
}

const OtpSchema = new mongoose.Schema<IOtp>(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    code: { type: String, required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    expiresAt: { type: Date, required: true },
    used: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

OtpSchema.index({ userId: 1, code: 1 });

export const Otp = mongoose.model<IOtp>("Otp", OtpSchema);
