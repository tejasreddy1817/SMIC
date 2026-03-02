import { useAuth } from "@/hooks/useAuth";
import { ReactNode } from "react";

interface CanProps {
  permission?: string;
  role?: string | string[];
  children: ReactNode;
  fallback?: ReactNode;
}

export function Can({ permission, role, children, fallback = null }: CanProps) {
  const { hasPermission, role: userRole } = useAuth();

  if (permission && !hasPermission(permission)) return <>{fallback}</>;
  if (role) {
    const roles = Array.isArray(role) ? role : [role];
    if (!userRole || !roles.includes(userRole)) return <>{fallback}</>;
  }

  return <>{children}</>;
}
