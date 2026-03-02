import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { roleHasPermission } from "../utils/rbac";
import { logAudit } from "../services/audit.service";

export interface AuthRequest extends Request {
  userId?: string;
  role?: string;
  organizationId?: string;
  impersonating?: boolean;
  realUserId?: string;
  realRole?: string;
}

export function ensureAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: "No token" });
  const token = auth.replace(/^Bearer\s+/, "");
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET as string) as any;
    req.userId = payload.sub;
    req.role = payload.role;
    req.organizationId = payload.orgId;

    // Block suspended accounts
    if (payload.suspended) {
      return res.status(403).json({ error: "Account suspended" });
    }

    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid token" });
  }
}

export function ensureRole(allowed: string | string[]) {
  const allowedArr = Array.isArray(allowed) ? allowed : [allowed];
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.role) return res.status(403).json({ error: "No role in token" });
    if (!allowedArr.includes(req.role)) return res.status(403).json({ error: "Forbidden" });
    next();
  };
}

// Ensure a specific permission is granted to the caller.
export function ensurePermission(permission: string) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.role) return res.status(403).json({ error: "No role in token" });

    // Environment-based restriction: developers may only impersonate in non-production
    if (permission.startsWith("impersonate:") && process.env.NODE_ENV === "production") {
      return res.status(403).json({ error: "Impersonation forbidden in production" });
    }

    if (!roleHasPermission(req.role, permission)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    next();
  };
}

// Ensure the user belongs to an organization
export function ensureOrg(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.organizationId) {
    return res.status(403).json({ error: "Organization membership required" });
  }
  next();
}

// Ensure the resource belongs to the same organization as the requesting user
export function ensureSameOrg(orgIdSource: "params" | "body" = "params", field = "orgId") {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    const source = orgIdSource === "params" ? req.params : req.body;
    const resourceOrgId = source[field];
    if (resourceOrgId && req.organizationId !== resourceOrgId) {
      return res.status(403).json({ error: "Cross-organization access denied" });
    }
    next();
  };
}

// Allow access if the user owns the resource OR has elevated (any-scope) permission
export function ensureOwnerOrPermission(permission: string) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    // If user has the :any version of the permission, allow
    if (roleHasPermission(req.role, permission.replace(":self", ":any"))) {
      return next();
    }
    // Otherwise the resource must belong to the requesting user
    const resourceUserId = req.params.userId || req.params.id;
    if (resourceUserId === req.userId) {
      return next();
    }
    return res.status(403).json({ error: "Forbidden" });
  };
}

// Audit-logging middleware for sensitive operations. Logs after successful response.
export function auditSensitive(action: string) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    const originalJson = res.json.bind(res);
    res.json = function (body: any) {
      if (res.statusCode < 400) {
        logAudit({
          actor: req.realUserId || req.userId || "unknown",
          action,
          target: req.params.id || req.params.userId || req.body?.userId,
          ip: req.ip,
          userAgent: req.headers["user-agent"],
          organizationId: req.organizationId,
          details: {
            impersonating: req.impersonating || false,
            method: req.method,
            path: req.originalUrl,
          },
        });
      }
      return originalJson(body);
    };
    next();
  };
}

// Block action if NODE_ENV is not in the allowed list
export function ensureEnvironment(allowed: string[]) {
  return (_req: AuthRequest, res: Response, next: NextFunction) => {
    const env = process.env.NODE_ENV || "development";
    if (!allowed.includes(env)) {
      return res.status(403).json({ error: `Action not allowed in ${env} environment` });
    }
    next();
  };
}
