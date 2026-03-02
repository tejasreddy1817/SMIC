import { roleHasPermission, Role, ROLE_HIERARCHY } from "../utils/rbac";

export class PermissionError extends Error {
  status = 403;
  constructor(message = "Forbidden") {
    super(message);
    this.name = "PermissionError";
  }
}

export function assertPermission(role: string | undefined, permission: string): void {
  if (!roleHasPermission(role, permission)) {
    throw new PermissionError(`Missing permission: ${permission}`);
  }
}

export function assertOwnership(actorId: string, resourceOwnerId: string): void {
  if (actorId !== resourceOwnerId) {
    throw new PermissionError("Not the owner of this resource");
  }
}

export function assertCanAssignRole(actorRole: string, targetRole: string): void {
  const actorLevel = ROLE_HIERARCHY[actorRole as Role] ?? -1;
  const targetLevel = ROLE_HIERARCHY[targetRole as Role] ?? -1;
  if (targetLevel >= actorLevel) {
    throw new PermissionError(
      `Cannot assign role '${targetRole}' -- equal or higher than your role '${actorRole}'`
    );
  }
}

export function assertSameOrg(
  actorOrgId: string | undefined,
  targetOrgId: string | undefined
): void {
  if (!actorOrgId || !targetOrgId || actorOrgId !== targetOrgId) {
    throw new PermissionError("Cross-organization access denied");
  }
}
