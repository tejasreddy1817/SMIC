import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/useAuth";
import { useCreator } from "@/hooks/useCreator";
import {
  LayoutDashboard,
  TrendingUp,
  Lightbulb,
  FileText,
  Newspaper,
  BarChart3,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Zap,
  Shield,
  Activity,
  CalendarDays,
  Bell,
  Sun,
  Moon,
  Monitor,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import Chatbot from "@/components/ui/chatbot";
import { useTheme } from "@/hooks/useTheme";

const navItems = [
  { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { path: "/trends", label: "Trends", icon: TrendingUp },
  { path: "/ideas", label: "Ideas", icon: Lightbulb },
  { path: "/scripts", label: "Scripts", icon: FileText },
  { path: "/news-script", label: "News Script", icon: Newspaper },
  { path: "/predict", label: "Predict", icon: BarChart3 },
  { path: "/status", label: "Status", icon: Activity },
  { path: "/calendar", label: "Calendar", icon: CalendarDays },
  { path: "/notifications", label: "Notifications", icon: Bell },
];

export function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const { signOut, role } = useAuth();
  const { theme, setTheme } = useTheme();
  const { creator } = useCreator();
  const location = useLocation();

  const initials = creator?.display_name
    ? creator.display_name.slice(0, 2).toUpperCase()
    : creator?.email?.slice(0, 2).toUpperCase() || "PU";

  const showAdmin = role && role !== "user";

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-sidebar-border bg-sidebar transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <Zap className="h-5 w-5 text-primary-foreground" />
          </div>
          {!collapsed && (
            <span className="text-xl font-bold text-gradient-primary">SMIC</span>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-sidebar-foreground hover:bg-sidebar-accent"
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 py-4">
        <nav className="flex flex-col gap-1 px-2">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  collapsed && "justify-center px-2"
                )}
              >
                <item.icon className={cn("h-5 w-5 shrink-0", isActive && "text-primary")} />
                {!collapsed && <span>{item.label}</span>}
              </NavLink>
            );
          })}

          {/* Internal UI Link (for staff/developer/founder) */}
          {showAdmin && (
            <>
              <Separator className="my-3" />
              <NavLink
                to="/admin"
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  collapsed && "justify-center px-2"
                )}
              >
                <Shield className={cn("h-5 w-5 shrink-0")} />
                {!collapsed && <span>Internal Ops</span>}
              </NavLink>
            </>
          )}
        </nav>
      </ScrollArea>

      {/* Footer */}
      <div className="border-t border-sidebar-border p-2">
        {/* Theme Toggle */}
        <div
          className={cn(
            "flex items-center gap-1 rounded-lg px-1 py-1 mb-1",
            collapsed ? "justify-center" : "justify-between px-3"
          )}
        >
          {!collapsed && (
            <span className="text-xs font-medium text-sidebar-foreground">Theme</span>
          )}
          <div className="flex items-center gap-0.5 rounded-md bg-sidebar-accent p-0.5">
            <button
              onClick={() => setTheme("light")}
              className={cn(
                "rounded p-1.5 transition-colors",
                theme === "light"
                  ? "bg-primary text-primary-foreground"
                  : "text-sidebar-foreground hover:text-foreground"
              )}
              title="Light mode"
            >
              <Sun className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setTheme("dark")}
              className={cn(
                "rounded p-1.5 transition-colors",
                theme === "dark"
                  ? "bg-primary text-primary-foreground"
                  : "text-sidebar-foreground hover:text-foreground"
              )}
              title="Dark mode"
            >
              <Moon className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setTheme("system")}
              className={cn(
                "rounded p-1.5 transition-colors",
                theme === "system"
                  ? "bg-primary text-primary-foreground"
                  : "text-sidebar-foreground hover:text-foreground"
              )}
              title="System"
            >
              <Monitor className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <Chatbot collapsed={collapsed} />
        <NavLink
          to="/settings"
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground transition-all hover:bg-sidebar-accent",
            collapsed && "justify-center px-2",
            location.pathname === "/settings" && "bg-primary/10 text-primary"
          )}
        >
          <Settings className="h-5 w-5 shrink-0" />
          {!collapsed && <span>Settings</span>}
        </NavLink>

        <div
          className={cn(
            "mt-2 flex items-center gap-3 rounded-lg px-3 py-2",
            collapsed && "justify-center px-2"
          )}
        >
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-primary/20 text-xs font-medium text-primary">
              {initials}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="flex flex-1 flex-col overflow-hidden">
              <span className="truncate text-sm font-medium text-foreground">
                {creator?.display_name || "Creator"}
              </span>
              <span className="truncate text-xs text-muted-foreground">
                {creator?.email}
              </span>
            </div>
          )}
          {!collapsed && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
              onClick={signOut}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </aside>
  );
}
