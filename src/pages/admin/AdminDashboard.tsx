import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { Can } from "@/components/auth/Can";
import { api } from "@/lib/api";
import { Users, Building, ShieldCheck, Activity, UserX, BarChart3, Settings, DollarSign, UserCog } from "lucide-react";
import { Link } from "react-router-dom";

interface Metrics {
  totalUsers: number;
  activeUsers: number;
  suspendedUsers: number;
  totalOrgs: number;
  roleBreakdown: Record<string, number>;
}

export default function AdminDashboard() {
  const { role } = useAuth();
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const resp = await api.get("/api/admin/metrics");
        if (resp.ok) {
          setMetrics(await resp.json());
        }
      } catch {
        // metrics may not be available for all roles
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const statCards = metrics
    ? [
        { label: "Total Users", value: metrics.totalUsers, icon: Users, color: "text-blue-500" },
        { label: "Active Users", value: metrics.activeUsers, icon: Activity, color: "text-green-500" },
        { label: "Suspended", value: metrics.suspendedUsers, icon: UserX, color: "text-red-500" },
        { label: "Organizations", value: metrics.totalOrgs, icon: Building, color: "text-purple-500" },
      ]
    : [];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <div className="text-muted-foreground mt-1 flex items-center">
            System overview and management
            <Badge variant="outline" className="ml-2 capitalize">
              {role}
            </Badge>
          </div>
        </div>

        {/* Metrics Grid */}
        <Can permission="metrics:read">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {loading ? (
              <p className="text-muted-foreground col-span-4">Loading metrics...</p>
            ) : (
              statCards.map((stat) => (
                <Card key={stat.label}>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">{stat.label}</CardTitle>
                    <stat.icon className={`h-4 w-4 ${stat.color}`} />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stat.value}</div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </Can>

        {/* Role Breakdown */}
        <Can permission="metrics:read">
          {metrics?.roleBreakdown && (
            <Card>
              <CardHeader>
                <CardTitle>Role Distribution</CardTitle>
                <CardDescription>Users by role</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4 flex-wrap">
                  {Object.entries(metrics.roleBreakdown).map(([r, count]) => (
                    <div key={r} className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium capitalize">{r}:</span>
                      <span>{count}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </Can>

        {/* Quick Links */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Can permission="user:read:any">
            <Link to="/admin/users">
              <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
                <CardHeader>
                  <CardTitle className="text-lg">User Management</CardTitle>
                  <CardDescription>View, suspend, and manage user accounts</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          </Can>

          <Can permission="ticket:read:any">
            <Link to="/admin/tickets">
              <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
                <CardHeader>
                  <CardTitle className="text-lg">Support Tickets</CardTitle>
                  <CardDescription>Manage customer support tickets</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          </Can>

          <Can permission="audit:read:self">
            <Link to="/admin/audit">
              <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
                <CardHeader>
                  <CardTitle className="text-lg">Audit Logs</CardTitle>
                  <CardDescription>View system activity and audit trail</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          </Can>

          <Can permission="feature_flags:manage">
            <Link to="/admin/feature-flags">
              <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
                <CardHeader>
                  <CardTitle className="text-lg">Feature Flags</CardTitle>
                  <CardDescription>Toggle features on and off</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          </Can>

          <Can permission="logs:read">
            <Link to="/admin/logs">
              <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
                <CardHeader>
                  <CardTitle className="text-lg">System Logs</CardTitle>
                  <CardDescription>Application logs and diagnostics</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          </Can>

          <Can permission="org:manage">
            <Link to="/admin/org">
              <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
                <CardHeader>
                  <CardTitle className="text-lg">Organization</CardTitle>
                  <CardDescription>Manage organization settings and members</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          </Can>

          <Can permission="reports:read">
            <Link to="/admin/reports">
              <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
                <CardHeader>
                  <CardTitle className="text-lg">Reports & Analytics</CardTitle>
                  <CardDescription>Platform-wide performance and growth insights</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          </Can>

          <Can permission="settings:read">
            <Link to="/admin/settings">
              <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
                <CardHeader>
                  <CardTitle className="text-lg">General Settings</CardTitle>
                  <CardDescription>Configure platform-wide settings and preferences</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          </Can>

          <Can permission="billing:manage">
            <Link to="/admin/finance">
              <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
                <CardHeader>
                  <CardTitle className="text-lg">Payment & Finance</CardTitle>
                  <CardDescription>Revenue, transactions, and subscription management</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          </Can>

          <Can permission="roles:manage">
            <Link to="/admin/roles">
              <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
                <CardHeader>
                  <CardTitle className="text-lg">Roles & Permissions</CardTitle>
                  <CardDescription>View and manage role-based access control</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          </Can>
        </div>
      </div>
    </AdminLayout>
  );
}
