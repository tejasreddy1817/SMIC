import { useAuth } from "./useAuth";
import { ROLE_HIERARCHY, Role } from "@/lib/permissions";

export function usePermission(permission: string): boolean {
  const { hasPermission } = useAuth();
  return hasPermission(permission);
}

export function useRole(): string | null {
  const { role } = useAuth();
  return role;
}

export function useMinRole(minRole: string): boolean {
  const { role } = useAuth();
  if (!role) return false;
  const userLevel = ROLE_HIERARCHY[role as Role] ?? -1;
  const minLevel = ROLE_HIERARCHY[minRole as Role] ?? Infinity;
  return userLevel >= minLevel;
}
