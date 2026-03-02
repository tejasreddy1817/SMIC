import { AuditLog } from "../models/AuditLog";

export interface AuditEntry {
  actor: string;
  action: string;
  target?: string;
  targetType?: string;
  details?: Record<string, any>;
  ip?: string;
  userAgent?: string;
  organizationId?: string;
}

const SENSITIVE_ACTIONS = [
  "user:role:update",
  "user:suspend",
  "user:reactivate",
  "user:reset_password",
  "user:delete",
  "org:create",
  "org:delete",
  "org:transfer",
  "subscription:plan:manage",
  "subscription:plan:create",
  "billing:manage",
  "config:update:basic",
  "config:update:env",
  "impersonate:start",
  "impersonate:end",
  "feature_flags:update",
  "trends:recompute",
];

export async function logAudit(entry: AuditEntry): Promise<void> {
  try {
    await AuditLog.create({
      actor: entry.actor,
      action: entry.action,
      target: entry.target,
      details: {
        ...entry.details,
        targetType: entry.targetType,
        ip: entry.ip,
        userAgent: entry.userAgent,
      },
      organizationId: entry.organizationId,
    });
  } catch (e) {
    console.error("Audit log error:", e);
  }
}

export function isSensitiveAction(action: string): boolean {
  return SENSITIVE_ACTIONS.some((s) => action.startsWith(s));
}
