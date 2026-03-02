import mongoose from "mongoose";

export interface IOrganization extends mongoose.Document {
  name: string;
  slug: string;
  ownerId: mongoose.Types.ObjectId;
  plan: string;
  settings: {
    allowedDomains?: string[];
    maxMembers: number;
    features: Record<string, boolean>;
  };
  suspended: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const OrganizationSchema = new mongoose.Schema<IOrganization>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    plan: { type: String, default: "free" },
    settings: {
      allowedDomains: { type: [String], default: [] },
      maxMembers: { type: Number, default: 5 },
      features: { type: Object, default: {} },
    },
    suspended: { type: Boolean, default: false },
  },
  { timestamps: true }
);

OrganizationSchema.index({ slug: 1 });
OrganizationSchema.index({ ownerId: 1 });

export const Organization = mongoose.model<IOrganization>("Organization", OrganizationSchema);
