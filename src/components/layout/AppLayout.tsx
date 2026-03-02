import { ReactNode } from "react";
import { AppSidebar } from "./AppSidebar";
import { cn } from "@/lib/utils";

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <AppSidebar />
      <main className={cn("ml-64 min-h-screen transition-all duration-300")}>
        <div className="container py-8">{children}</div>
      </main>
    </div>
  );
}
