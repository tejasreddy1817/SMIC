export type Role = "user" | "staff" | "developer" | "founder";

// Permission strings follow the pattern: action:resource:scope
export type Permission = string;

export const ROLE_HIERARCHY: Record<Role, number> = {
  user: 0,
  staff: 1,
  developer: 2,
  founder: 3,
};

export function roleLevel(role: string): number {
  return ROLE_HIERARCHY[role as Role] ?? -1;
}

// ---------------------------------------------------------------------------
// Role-specific permissions (before inheritance merge)
// Each role lists ONLY its own unique permissions. Lower role permissions
// are inherited automatically via the additive merge below.
// ---------------------------------------------------------------------------
const ROLE_OWN_PERMISSIONS: Record<Role, Permission[]> = {
  user: [
    // Self profile
    "user:read:self",
    "user:update:self",
    // Own content CRUD
    "content:crud:self",
    // App features (chat, RAG, agents, predictions)
    "app:use",
    // Own API keys
    "keys:manage:self",
    // Own support tickets
    "ticket:create:self",
    "ticket:read:self",
    // Own subscription
    "subscription:read:self",
    "subscription:subscribe:self",
    // Public data
    "trends:read",
    "helpline:read",
  ],
  staff: [
    // User management (support purposes)
    "user:read:any",
    "user:update:any",
    "user:reset_password",
    "user:suspend",
    "user:reactivate",
    // Content moderation
    "content:moderate",
    "content:read:any",
    // Support tickets (all)
    "ticket:read:any",
    "ticket:update:any",
    "ticket:resolve:any",
    // Basic config (content categories, app settings)
    "config:update:basic",
    // Helpline management
    "helpline:manage",
    // Subscription plans (read only)
    "subscription:plan:read",
    // Audit logs (own actions)
    "audit:read:self",
  ],
  developer: [
    // Observability and debugging
    "logs:read",
    "debug:read",
    "metrics:read",
    // Feature flags
    "feature_flags:manage",
    // API and integration management
    "integrations:manage",
    "api:manage",
    // Environment config (non-billing)
    "config:update:env",
    // Impersonation (staging/testing only -- enforced in middleware)
    "impersonate:staging",
    "impersonate:testing",
    // Trends data pipeline
    "trends:signal:write",
    "trends:recompute",
    // Read users (for debugging)
    "user:read:any",
    // Audit logs (all, for debugging)
    "audit:read:any",
  ],
  founder: [
    "*", // wildcard -- full access

    // Explicit permissions listed for documentation and auditability
    // (all covered by '*' but declared so they appear in permission listings)
    "user:role:manage",
    "org:manage",
    "org:create",
    "org:delete",
    "org:transfer",
    "subscription:plan:manage",
    "billing:manage",
    "billing:read",
  ],
};

// ---------------------------------------------------------------------------
// Build additive permission sets: each role inherits all lower roles' perms
// user  → user perms only
// staff → staff + user perms
// developer → developer + user perms  (NOT staff — different track)
// founder → founder + all perms (redundant with *, but complete)
// ---------------------------------------------------------------------------
const ROLES_ORDERED: Role[] = ["user", "staff", "developer", "founder"];

const ROLE_PERMISSIONS: Record<Role, Permission[]> = (() => {
  const result = {} as Record<Role, Permission[]>;

  for (const role of ROLES_ORDERED) {
    const level = ROLE_HIERARCHY[role];
    const merged = new Set<string>();

    // Collect permissions from this role and all lower roles
    for (const r of ROLES_ORDERED) {
      if (ROLE_HIERARCHY[r] <= level) {
        for (const p of ROLE_OWN_PERMISSIONS[r]) {
          merged.add(p);
        }
      }
    }

    result[role] = Array.from(merged);
  }

  return result;
})();

export function getPermissionsForRole(r: Role | string): Permission[] {
  if ((ROLE_PERMISSIONS as any)[r]) return (ROLE_PERMISSIONS as any)[r];
  return [];
}

// Check whether a granted permission covers the required permission.
function grantedCovers(granted: Permission, required: Permission): boolean {
  if (granted === "*") return true;
  if (granted === required) return true;

  const gParts = granted.split(":");
  const rParts = required.split(":");

  const maxLen = Math.max(gParts.length, rParts.length);
  for (let i = 0; i < maxLen; i++) {
    const gSeg = gParts[i] ?? "any";
    const rSeg = rParts[i] ?? "any";
    if (gSeg === "*") continue; // wildcard segment matches anything
    if (gSeg === "any" && rSeg === "self") continue; // 'any' scope covers 'self'
    if (gSeg !== rSeg) return false;
  }
  return true;
}

export function roleHasPermission(role: string | undefined, permission: Permission): boolean {
  if (!role) return false;
  const perms = getPermissionsForRole(role as Role);
  for (const gp of perms) {
    if (grantedCovers(gp, permission)) return true;
  }
  return false;
}

export default ROLE_PERMISSIONS;
