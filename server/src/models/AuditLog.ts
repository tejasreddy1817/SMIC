import mongoose from "mongoose";

export interface IAuditLog extends mongoose.Document {
  actor?: mongoose.Types.ObjectId;
  action: string;
  target?: mongoose.Types.ObjectId;
  targetType?: string;
  details?: Record<string, any>;
  ip?: string;
  userAgent?: string;
  organizationId?: mongoose.Types.ObjectId;
  createdAt: Date;
}

const AuditLogSchema = new mongoose.Schema<IAuditLog>(
  {
    actor: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    action: { type: String, required: true },
    target: { type: mongoose.Schema.Types.ObjectId },
    targetType: { type: String },
    details: { type: Object, default: {} },
    ip: { type: String },
    userAgent: { type: String },
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: "Organization" },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

AuditLogSchema.index({ action: 1, actor: 1, target: 1 });
AuditLogSchema.index({ organizationId: 1, createdAt: -1 });

export const AuditLog = mongoose.model<IAuditLog>("AuditLog", AuditLogSchema);
