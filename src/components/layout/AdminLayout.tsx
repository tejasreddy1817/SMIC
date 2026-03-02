import { ReactNode } from "react";
import { AdminSidebar } from "./AdminSidebar";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Shield } from "lucide-react";

interface AdminLayoutProps {
  children: ReactNode;
}

const ROLE_COLORS: Record<string, string> = {
  staff: "bg-blue-500/10 text-blue-600 border-blue-500/30",
  developer: "bg-purple-500/10 text-purple-600 border-purple-500/30",
  founder: "bg-amber-500/10 text-amber-600 border-amber-500/30",
};

export function AdminLayout({ children }: AdminLayoutProps) {
  const { role } = useAuth();

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <AdminSidebar />

      {/* Top bar with persistent role badge */}
      <div className="ml-64 sticky top-0 z-30 flex h-12 items-center justify-between border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm px-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Shield className="h-4 w-4" />
          <span>Internal Operations</span>
        </div>
        <Badge
          variant="outline"
          className={cn("capitalize font-semibold", ROLE_COLORS[role || ""] || "")}
        >
          {role}
        </Badge>
      </div>

      <main className={cn("ml-64 min-h-[calc(100vh-3rem)] transition-all duration-300")}>
        <div className="container py-6">{children}</div>
      </main>
    </div>
  );
}
