import { useAuth } from "@/hooks/useAuth";
import { useCreator } from "@/hooks/useCreator";
import { Navigate } from "react-router-dom";
import { Loader2, WifiOff, RefreshCw } from "lucide-react";
import { ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface ProtectedRouteProps {
  children: ReactNode;
  requiredPermission?: string;
  requiredRole?: string[];
  fallback?: ReactNode;
}

export function ProtectedRoute({
  children,
  requiredPermission,
  requiredRole,
  fallback,
}: ProtectedRouteProps) {
  const { user, loading: authLoading, role, hasPermission, serverOnline } = useAuth();
  const { isOnboarded, loading: creatorLoading } = useCreator();

  if (authLoading || creatorLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    // If server is offline, show a helpful message instead of just redirecting to auth
    if (!serverOnline) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-4">
          <WifiOff className="h-12 w-12 text-muted-foreground" />
          <h2 className="text-xl font-semibold text-foreground">Backend Server Offline</h2>
          <p className="max-w-md text-center text-sm text-muted-foreground">
            Cannot connect to the backend server. Please start it with:
          </p>
          <code className="rounded-lg border bg-muted px-4 py-2 text-sm">
            cd server && npm run dev
          </code>
          <Button
            variant="outline"
            onClick={() => window.location.reload()}
            className="mt-2"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry
          </Button>
        </div>
      );
    }
    return <Navigate to="/auth" replace />;
  }

  // Internal users (staff/developer/founder) skip onboarding — they don't use Supabase creators table
  const internalRoles = ["staff", "developer", "founder"];
  const isInternal = !!role && internalRoles.includes(role);

  if (!isOnboarded && !isInternal) {
    return <Navigate to="/onboarding" replace />;
  }

  // Role check
  if (requiredRole && role && !requiredRole.includes(role)) {
    return fallback ? <>{fallback}</> : <Navigate to="/dashboard" replace />;
  }

  // Permission check
  if (requiredPermission && !hasPermission(requiredPermission)) {
    return fallback ? <>{fallback}</> : <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
