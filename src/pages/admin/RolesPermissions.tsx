import { useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Shield,
  Users,
  Code,
  Crown,
  User,
  Check,
  X,
  ChevronDown,
  ChevronRight,
  Info,
  Lock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getPermissionsForRole, ROLE_HIERARCHY, type Role } from "@/lib/permissions";

interface PermissionGroup {
  label: string;
  permissions: { key: string; label: string; description: string }[];
}

const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    label: "User Management",
    permissions: [
      { key: "user:read:self", label: "View own profile", description: "Can view their own user profile" },
      { key: "user:update:self", label: "Update own profile", description: "Can modify their own profile" },
      { key: "user:read:any", label: "View all users", description: "Can view any user's profile" },
      { key: "user:update:any", label: "Update any user", description: "Can modify any user's profile" },
      { key: "user:suspend", label: "Suspend users", description: "Can suspend user accounts" },
      { key: "user:reactivate", label: "Reactivate users", description: "Can reactivate suspended accounts" },
      { key: "user:reset_password", label: "Reset passwords", description: "Can trigger password resets" },
      { key: "user:role:manage", label: "Manage roles", description: "Can change user roles" },
    ],
  },
  {
    label: "Content",
    permissions: [
      { key: "content:crud:self", label: "Manage own content", description: "Full CRUD on own content" },
      { key: "content:read:any", label: "Read any content", description: "Can view all users' content" },
      { key: "content:moderate", label: "Moderate content", description: "Can moderate/remove content" },
    ],
  },
  {
    label: "Pipeline & AI",
    permissions: [
      { key: "app:use", label: "Use application", description: "Access to the main application" },
      { key: "trends:read", label: "Read trends", description: "Can view trending topics" },
      { key: "trends:signal:write", label: "Write trend signals", description: "Can inject trend signals" },
      { key: "trends:recompute", label: "Recompute trends", description: "Can trigger trend recomputation" },
    ],
  },
  {
    label: "Support & Tickets",
    permissions: [
      { key: "ticket:create:self", label: "Create tickets", description: "Can create support tickets" },
      { key: "ticket:read:self", label: "Read own tickets", description: "Can view their tickets" },
      { key: "ticket:read:any", label: "Read all tickets", description: "Can view all support tickets" },
      { key: "ticket:update:any", label: "Update any ticket", description: "Can modify any ticket" },
      { key: "ticket:resolve:any", label: "Resolve tickets", description: "Can resolve/close tickets" },
    ],
  },
  {
    label: "System & DevOps",
    permissions: [
      { key: "logs:read", label: "Read logs", description: "Can view system logs" },
      { key: "debug:read", label: "Debug access", description: "Can access debug tools" },
      { key: "metrics:read", label: "View metrics", description: "Can view system metrics" },
      { key: "feature_flags:manage", label: "Feature flags", description: "Can toggle feature flags" },
      { key: "integrations:manage", label: "Manage integrations", description: "Can manage third-party integrations" },
      { key: "api:manage", label: "API management", description: "Can manage API settings" },
      { key: "config:update:basic", label: "Basic config", description: "Can update basic configuration" },
      { key: "config:update:env", label: "Env config", description: "Can update environment config" },
    ],
  },
  {
    label: "Audit & Impersonation",
    permissions: [
      { key: "audit:read:self", label: "Read own audit", description: "Can view own audit trail" },
      { key: "audit:read:any", label: "Read all audits", description: "Can view all audit logs" },
      { key: "impersonate:staging", label: "Impersonate (staging)", description: "Can impersonate users in staging" },
      { key: "impersonate:testing", label: "Impersonate (testing)", description: "Can impersonate users in testing" },
    ],
  },
  {
    label: "Organization & Billing",
    permissions: [
      { key: "org:manage", label: "Manage organization", description: "Can manage organization settings" },
      { key: "org:create", label: "Create organization", description: "Can create new organizations" },
      { key: "org:delete", label: "Delete organization", description: "Can delete organizations" },
      { key: "org:transfer", label: "Transfer organization", description: "Can transfer ownership" },
      { key: "billing:manage", label: "Manage billing", description: "Can manage billing settings" },
      { key: "billing:read", label: "View billing", description: "Can view billing details" },
      { key: "subscription:read:self", label: "View own subscription", description: "Can view their subscription" },
      { key: "subscription:subscribe:self", label: "Subscribe", description: "Can subscribe to plans" },
      { key: "subscription:plan:read", label: "Read plans", description: "Can view all plans" },
      { key: "subscription:plan:manage", label: "Manage plans", description: "Can create/edit plans" },
    ],
  },
  {
    label: "Other",
    permissions: [
      { key: "keys:manage:self", label: "API keys", description: "Can manage own API keys" },
      { key: "helpline:read", label: "Read help", description: "Can access help content" },
      { key: "helpline:manage", label: "Manage help", description: "Can manage help articles" },
      { key: "*", label: "Superadmin", description: "Full access to everything" },
    ],
  },
];

const ROLES: { key: Role; label: string; icon: any; color: string; description: string }[] = [
  { key: "user", label: "User", icon: User, color: "text-gray-500", description: "External creators who use the platform" },
  { key: "staff", label: "Staff", icon: Users, color: "text-orange-500", description: "Internal team members with moderation access" },
  { key: "developer", label: "Developer", icon: Code, color: "text-blue-500", description: "Engineers with system access and debugging tools" },
  { key: "founder", label: "Founder", icon: Crown, color: "text-purple-500", description: "Full administrative control over the platform" },
];

export default function RolesPermissions() {
  const [expandedGroups, setExpandedGroups] = useState<string[]>(PERMISSION_GROUPS.map((g) => g.label));

  const toggleGroup = (label: string) => {
    setExpandedGroups((prev) =>
      prev.includes(label) ? prev.filter((g) => g !== label) : [...prev, label]
    );
  };

  const rolePerms = ROLES.reduce(
    (acc, r) => {
      acc[r.key] = getPermissionsForRole(r.key);
      return acc;
    },
    {} as Record<Role, string[]>
  );

  const hasPermission = (role: Role, permission: string): boolean => {
    const perms = rolePerms[role];
    if (perms.includes("*")) return true;
    if (perms.includes(permission)) return true;
    // Check partial match (e.g., user:read:any covers user:read:any:org)
    for (const p of perms) {
      if (p === "*") return true;
      if (permission.startsWith(p)) return true;
    }
    return false;
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="h-8 w-8" />
            Roles & Permissions
          </h1>
          <p className="text-muted-foreground mt-1">View and understand the role-based access control system</p>
        </div>

        {/* Role Overview Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {ROLES.map((role) => {
            const permCount = rolePerms[role.key].length;
            const RoleIcon = role.icon;
            return (
              <Card key={role.key} className="hover:border-primary/30 transition-colors">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <RoleIcon className={cn("h-5 w-5", role.color)} />
                    <CardTitle className="text-base">{role.label}</CardTitle>
                  </div>
                  <CardDescription className="text-xs">{role.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Permissions</span>
                    <Badge variant="outline">
                      {role.key === "founder" ? "All" : permCount}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-sm text-muted-foreground">Hierarchy Level</span>
                    <Badge variant="outline">{ROLE_HIERARCHY[role.key]}</Badge>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Info */}
        <Card className="border-blue-500/20 bg-blue-500/5">
          <CardContent className="p-4 flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium">Additive Inheritance</p>
              <p className="text-sm text-muted-foreground">
                Each role inherits all permissions from lower roles. Staff inherits User permissions,
                Developer inherits Staff + User, and Founder inherits all.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Permission Matrix */}
        <Card>
          <CardHeader>
            <CardTitle>Permission Matrix</CardTitle>
            <CardDescription>Complete breakdown of permissions by role</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {PERMISSION_GROUPS.map((group) => {
                const isExpanded = expandedGroups.includes(group.label);
                return (
                  <div key={group.label} className="border rounded-lg">
                    <button
                      className="flex items-center justify-between w-full p-3 text-left hover:bg-muted/50 transition-colors"
                      onClick={() => toggleGroup(group.label)}
                    >
                      <span className="font-medium">{group.label}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">{group.permissions.length} permissions</span>
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="border-t">
                        {/* Header row */}
                        <div className="grid grid-cols-[1fr_80px_80px_80px_80px] gap-2 p-3 bg-muted/30 text-xs font-medium text-muted-foreground">
                          <span>Permission</span>
                          {ROLES.map((r) => (
                            <span key={r.key} className="text-center capitalize">{r.label}</span>
                          ))}
                        </div>

                        {/* Permission rows */}
                        {group.permissions.map((perm) => (
                          <div
                            key={perm.key}
                            className="grid grid-cols-[1fr_80px_80px_80px_80px] gap-2 p-3 border-t items-center hover:bg-muted/20"
                          >
                            <div>
                              <p className="text-sm font-medium">{perm.label}</p>
                              <p className="text-xs text-muted-foreground">{perm.description}</p>
                              <code className="text-[10px] text-muted-foreground">{perm.key}</code>
                            </div>
                            {ROLES.map((r) => {
                              const has = hasPermission(r.key, perm.key);
                              return (
                                <div key={r.key} className="flex justify-center">
                                  {has ? (
                                    <Check className="h-4 w-4 text-green-500" />
                                  ) : (
                                    <X className="h-4 w-4 text-muted-foreground/30" />
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Role Hierarchy */}
        <Card>
          <CardHeader>
            <CardTitle>Role Hierarchy</CardTitle>
            <CardDescription>Visual representation of role inheritance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center gap-4 py-6">
              {ROLES.map((role, index) => {
                const RoleIcon = role.icon;
                return (
                  <div key={role.key} className="flex items-center gap-4">
                    <div className="text-center">
                      <div className={cn(
                        "flex h-14 w-14 items-center justify-center rounded-full border-2 mx-auto",
                        role.key === "founder" ? "border-purple-500 bg-purple-500/10" :
                        role.key === "developer" ? "border-blue-500 bg-blue-500/10" :
                        role.key === "staff" ? "border-orange-500 bg-orange-500/10" :
                        "border-gray-400 bg-gray-100 dark:bg-gray-800"
                      )}>
                        <RoleIcon className={cn("h-6 w-6", role.color)} />
                      </div>
                      <p className="text-sm font-medium mt-2">{role.label}</p>
                      <p className="text-xs text-muted-foreground">Level {ROLE_HIERARCHY[role.key]}</p>
                    </div>
                    {index < ROLES.length - 1 && (
                      <div className="flex items-center">
                        <div className="h-0.5 w-8 bg-muted-foreground/30" />
                        <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
