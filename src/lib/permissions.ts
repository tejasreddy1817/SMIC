export type Role = "user" | "staff" | "developer" | "founder";
export type Permission = string;

export const ROLE_HIERARCHY: Record<Role, number> = {
  user: 0,
  staff: 1,
  developer: 2,
  founder: 3,
};

// Each role's own unique permissions (before inheritance)
const ROLE_OWN_PERMISSIONS: Record<Role, Permission[]> = {
  user: [
    "user:read:self",
    "user:update:self",
    "content:crud:self",
    "content:status:self",
    "calendar:read:self",
    "calendar:write:self",
    "notifications:read:self",
    "notifications:manage:self",
    "app:use",
    "keys:manage:self",
    "ticket:create:self",
    "ticket:read:self",
    "subscription:read:self",
    "subscription:subscribe:self",
    "trends:read",
    "helpline:read",
  ],
  staff: [
    "user:read:any",
    "user:update:any",
    "user:reset_password",
    "user:suspend",
    "user:reactivate",
    "content:moderate",
    "content:read:any",
    "content:status:any",
    "ticket:read:any",
    "ticket:update:any",
    "ticket:resolve:any",
    "config:update:basic",
    "helpline:manage",
    "subscription:plan:read",
    "audit:read:self",
    "reports:read",
    "settings:read",
  ],
  developer: [
    "logs:read",
    "debug:read",
    "metrics:read",
    "feature_flags:manage",
    "integrations:manage",
    "api:manage",
    "config:update:env",
    "impersonate:staging",
    "impersonate:testing",
    "trends:signal:write",
    "trends:recompute",
    "user:read:any",
    "audit:read:any",
    "reports:read",
    "settings:manage",
  ],
  founder: [
    "*",
    "user:role:manage",
    "org:manage",
    "org:create",
    "org:delete",
    "org:transfer",
    "subscription:plan:manage",
    "billing:manage",
    "billing:read",
    "roles:manage",
    "settings:manage",
    "reports:read",
    "finance:read",
    "finance:manage",
  ],
};

// Additive inheritance: each role inherits all lower roles' permissions
const ROLES_ORDERED: Role[] = ["user", "staff", "developer", "founder"];

const ROLE_PERMISSIONS: Record<Role, Permission[]> = (() => {
  const result = {} as Record<Role, Permission[]>;
  for (const role of ROLES_ORDERED) {
    const level = ROLE_HIERARCHY[role];
    const merged = new Set<string>();
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

export function getPermissionsForRole(r: string | null): Permission[] {
  if (!r) return [];
  if ((ROLE_PERMISSIONS as any)[r]) return (ROLE_PERMISSIONS as any)[r];
  return [];
}

function grantedCovers(granted: Permission, required: Permission): boolean {
  if (granted === "*") return true;
  if (granted === required) return true;

  const gParts = granted.split(":");
  const rParts = required.split(":");

  const maxLen = Math.max(gParts.length, rParts.length);
  for (let i = 0; i < maxLen; i++) {
    const gSeg = gParts[i] ?? "any";
    const rSeg = rParts[i] ?? "any";
    if (gSeg === "*") continue;
    if (gSeg === "any" && rSeg === "self") continue;
    if (gSeg !== rSeg) return false;
  }
  return true;
}

export function roleHasPermission(
  role: string | null | undefined,
  permission: Permission
): boolean {
  if (!role) return false;
  const perms = getPermissionsForRole(role);
  for (const gp of perms) {
    if (grantedCovers(gp, permission)) return true;
  }
  return false;
}

export function roleLevel(role: string): number {
  return ROLE_HIERARCHY[role as Role] ?? -1;
}
