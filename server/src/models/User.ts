import mongoose from "mongoose";

export type Role = "user" | "staff" | "founder" | "developer";

export interface IUser extends mongoose.Document {
  email: string;
  passwordHash: string;
  role: Role;
  organizationId?: mongoose.Types.ObjectId | null;
  subscriptionId?: mongoose.Types.ObjectId | null;
  suspended: boolean;
  lastLoginAt?: Date;
  metadata?: Record<string, any>;
  // Instagram auth fields
  instagram?: {
    id?: string;
    username?: string;
    profilePicture?: string;
    accountType?: string;
    accessToken?: string; // stored server-side only
    refreshToken?: string | null;
    tokenExpiresAt?: Date | null;
    linkedAt?: Date | null;
  };
}

const UserSchema = new mongoose.Schema<IUser>({
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ["user", "staff", "founder", "developer"], default: "user" },
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", default: null },
  subscriptionId: { type: mongoose.Schema.Types.ObjectId, ref: "Subscription", default: null },
  suspended: { type: Boolean, default: false },
  lastLoginAt: { type: Date },
  metadata: { type: Object, default: {} },
  instagram: {
    id: { type: String, index: true, sparse: true },
    username: { type: String },
    profilePicture: { type: String },
    accountType: { type: String },
    accessToken: { type: String, select: false },
    refreshToken: { type: String, select: false },
    tokenExpiresAt: { type: Date },
    linkedAt: { type: Date },
  },
});

UserSchema.index({ email: 1 });
UserSchema.index({ organizationId: 1 });

export const User = mongoose.model<IUser>("User", UserSchema);
