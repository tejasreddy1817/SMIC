import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/useAuth";
import {
  Shield,
  Users,
  Ticket,
  FileSearch,
  ToggleLeft,
  Terminal,
  Building,
  LayoutDashboard,
  ChevronLeft,
  ChevronRight,
  LogOut,
  ArrowLeft,
  Activity,
  Cpu,
  CreditCard,
  Power,
  BarChart3,
  Settings,
  UserCog,
  DollarSign,
  Sun,
  Moon,
  Monitor,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useTheme } from "@/hooks/useTheme";

interface AdminNavItem {
  path: string;
  label: string;
  icon: any;
  permission?: string;
  roles?: string[];
}

const adminNavItems: AdminNavItem[] = [
  { path: "/admin", label: "Overview", icon: Shield, roles: ["staff", "developer", "founder"] },
  { path: "/admin/users", label: "Users", icon: Users, permission: "user:read:any" },
  { path: "/admin/tickets", label: "Tickets", icon: Ticket, permission: "ticket:read:any" },
  { path: "/admin/audit", label: "Audit Log", icon: FileSearch, permission: "audit:read:self" },
  { path: "/admin/reports", label: "Reports & Analytics", icon: BarChart3, permission: "reports:read" },
  { path: "/admin/settings", label: "General Settings", icon: Settings, permission: "settings:read" },
];

const devNavItems: AdminNavItem[] = [
  { path: "/admin/feature-flags", label: "Feature Flags", icon: ToggleLeft, permission: "feature_flags:manage" },
  { path: "/admin/logs", label: "System Logs", icon: Terminal, permission: "logs:read" },
  { path: "/admin/pipeline-debug", label: "Pipeline Debug", icon: Cpu, permission: "debug:read" },
  { path: "/admin/metrics", label: "Metrics", icon: Activity, permission: "metrics:read" },
];

const founderNavItems: AdminNavItem[] = [
  { path: "/admin/org", label: "Organization", icon: Building, permission: "org:manage" },
  { path: "/admin/finance", label: "Payment & Finance", icon: DollarSign, permission: "billing:manage" },
  { path: "/admin/roles", label: "Roles & Permissions", icon: UserCog, permission: "roles:manage" },
  { path: "/admin/billing", label: "Billing", icon: CreditCard, permission: "billing:manage" },
  { path: "/admin/kill-switch", label: "Kill Switch", icon: Power, permission: "org:manage" },
];

export function AdminSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const { signOut, role, hasPermission } = useAuth();
  const { theme, setTheme } = useTheme();
  const location = useLocation();

  const filterItems = (items: AdminNavItem[]) =>
    items.filter((item) => {
      if (item.roles && role && !item.roles.includes(role)) return false;
      if (item.permission && !hasPermission(item.permission)) return false;
      return true;
    });

  const visibleAdmin = filterItems(adminNavItems);
  const visibleDev = filterItems(devNavItems);
  const visibleFounder = filterItems(founderNavItems);

  const renderNavItem = (item: AdminNavItem) => {
    const isActive = location.pathname === item.path;
    return (
      <NavLink
        key={item.path}
        to={item.path}
        className={cn(
          "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
          isActive
            ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
            : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100",
          collapsed && "justify-center px-2"
        )}
      >
        <item.icon className="h-5 w-5 shrink-0" />
        {!collapsed && <span>{item.label}</span>}
      </NavLink>
    );
  };

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Header */}
      <div className="flex h-16 items-center justify-between border-b border-zinc-200 dark:border-zinc-800 px-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900 dark:bg-zinc-100">
            <Shield className="h-5 w-5 text-white dark:text-zinc-900" />
          </div>
          {!collapsed && (
            <span className="text-xl font-bold">SMIC Ops</span>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      {/* Back to Creator UI */}
      <div className="px-2 pt-3">
        <NavLink
          to="/dashboard"
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all",
            collapsed && "justify-center px-2"
          )}
        >
          <ArrowLeft className="h-4 w-4 shrink-0" />
          {!collapsed && <span>Creator UI</span>}
        </NavLink>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 py-2">
        <nav className="flex flex-col gap-1 px-2">
          {/* Operations */}
          {visibleAdmin.length > 0 && (
            <>
              {!collapsed && (
                <span className="px-3 py-1 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  Operations
                </span>
              )}
              {visibleAdmin.map(renderNavItem)}
            </>
          )}

          {/* Developer Tools */}
          {visibleDev.length > 0 && (
            <>
              <Separator className="my-2" />
              {!collapsed && (
                <span className="px-3 py-1 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  Developer
                </span>
              )}
              {visibleDev.map(renderNavItem)}
            </>
          )}

          {/* Founder Controls */}
          {visibleFounder.length > 0 && (
            <>
              <Separator className="my-2" />
              {!collapsed && (
                <span className="px-3 py-1 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  Founder
                </span>
              )}
              {visibleFounder.map(renderNavItem)}
            </>
          )}
        </nav>
      </ScrollArea>

      {/* Footer */}
      <div className="border-t border-zinc-200 dark:border-zinc-800 p-2">
        {/* Theme Toggle */}
        <div
          className={cn(
            "flex items-center gap-1 rounded-lg px-1 py-1 mb-1",
            collapsed ? "justify-center" : "justify-between px-3"
          )}
        >
          {!collapsed && (
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Theme</span>
          )}
          <div className="flex items-center gap-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 p-0.5">
            <button
              onClick={() => setTheme("light")}
              className={cn(
                "rounded p-1.5 transition-colors",
                theme === "light"
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
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
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
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
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
              )}
              title="System"
            >
              <Monitor className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <div
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2",
            collapsed && "justify-center px-2"
          )}
        >
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-zinc-200 dark:bg-zinc-700 text-xs font-medium">
              OP
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="flex flex-1 items-center justify-between">
              <span className="text-sm font-medium capitalize">{role}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                onClick={signOut}
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
