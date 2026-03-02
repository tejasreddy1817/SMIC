import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { Can } from "@/components/auth/Can";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Users, Ban, CheckCircle, KeyRound, Shield } from "lucide-react";

interface UserRecord {
  _id: string;
  email: string;
  role: string;
  suspended: boolean;
  organizationId?: string;
  lastLoginAt?: string;
}

export default function UserManagement() {
  const { role: myRole } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterRole, setFilterRole] = useState<string>("all");
  const [search, setSearch] = useState("");

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params = filterRole !== "all" ? `?role=${filterRole}` : "";
      const resp = await api.get(`/api/users${params}`);
      if (resp.ok) setUsers(await resp.json());
    } catch {
      toast({ title: "Error", description: "Failed to load users", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [filterRole]);

  const handleSuspend = async (userId: string) => {
    const resp = await api.post(`/api/admin/suspend/${userId}`, {});
    if (resp.ok) {
      toast({ title: "User suspended" });
      fetchUsers();
    } else {
      const data = await resp.json();
      toast({ title: "Error", description: data.error, variant: "destructive" });
    }
  };

  const handleReactivate = async (userId: string) => {
    const resp = await api.post(`/api/admin/reactivate/${userId}`, {});
    if (resp.ok) {
      toast({ title: "User reactivated" });
      fetchUsers();
    } else {
      const data = await resp.json();
      toast({ title: "Error", description: data.error, variant: "destructive" });
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    const resp = await api.put(`/api/auth/role/${userId}`, { role: newRole });
    if (resp.ok) {
      toast({ title: "Role updated" });
      fetchUsers();
    } else {
      const data = await resp.json();
      toast({ title: "Error", description: data.error, variant: "destructive" });
    }
  };

  const filtered = users.filter((u) =>
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  const roleBadgeColor = (role: string) => {
    switch (role) {
      case "founder": return "bg-purple-500/10 text-purple-500 border-purple-500/20";
      case "developer": return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      case "staff": return "bg-orange-500/10 text-orange-500 border-orange-500/20";
      default: return "bg-gray-500/10 text-gray-500 border-gray-500/20";
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Users className="h-8 w-8" />
            User Management
          </h1>
          <p className="text-muted-foreground mt-1">
            View and manage user accounts
          </p>
        </div>

        {/* Filters */}
        <div className="flex gap-4 items-center">
          <Input
            placeholder="Search by email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-sm"
          />
          <Select value={filterRole} onValueChange={setFilterRole}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Filter by role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="user">User</SelectItem>
              <SelectItem value="staff">Staff</SelectItem>
              <SelectItem value="developer">Developer</SelectItem>
              <SelectItem value="founder">Founder</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* User List */}
        <Card>
          <CardHeader>
            <CardTitle>Users ({filtered.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-muted-foreground">Loading...</p>
            ) : filtered.length === 0 ? (
              <p className="text-muted-foreground">No users found</p>
            ) : (
              <div className="space-y-3">
                {filtered.map((u) => (
                  <div
                    key={u._id}
                    className="flex items-center justify-between rounded-lg border p-4"
                  >
                    <div className="flex items-center gap-4">
                      <div>
                        <p className="font-medium">{u.email}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className={roleBadgeColor(u.role)}>
                            {u.role}
                          </Badge>
                          {u.suspended && (
                            <Badge variant="destructive">Suspended</Badge>
                          )}
                          {u.lastLoginAt && (
                            <span className="text-xs text-muted-foreground">
                              Last login: {new Date(u.lastLoginAt).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Role change (founder only) */}
                      <Can permission="user:role:manage">
                        <Select
                          value={u.role}
                          onValueChange={(newRole) => handleRoleChange(u._id, newRole)}
                        >
                          <SelectTrigger className="w-32 h-8">
                            <Shield className="h-3 w-3 mr-1" />
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="user">User</SelectItem>
                            <SelectItem value="staff">Staff</SelectItem>
                            <SelectItem value="developer">Developer</SelectItem>
                          </SelectContent>
                        </Select>
                      </Can>

                      {/* Suspend/Reactivate */}
                      <Can permission="user:suspend">
                        {u.suspended ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleReactivate(u._id)}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Reactivate
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleSuspend(u._id)}
                          >
                            <Ban className="h-4 w-4 mr-1" />
                            Suspend
                          </Button>
                        )}
                      </Can>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
