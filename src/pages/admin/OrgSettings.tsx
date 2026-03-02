import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Building, Users, Save, UserPlus, Trash2 } from "lucide-react";

interface OrgData {
  _id: string;
  name: string;
  slug: string;
  ownerId: string;
  plan: string;
  settings: {
    maxMembers: number;
    allowedDomains: string[];
    features: Record<string, boolean>;
  };
}

interface MemberRecord {
  _id: string;
  email: string;
  role: string;
  suspended: boolean;
}

export default function OrgSettings() {
  const { organizationId } = useAuth();
  const { toast } = useToast();
  const [org, setOrg] = useState<OrgData | null>(null);
  const [members, setMembers] = useState<MemberRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [editName, setEditName] = useState("");
  const [editMaxMembers, setEditMaxMembers] = useState(5);
  const [inviteEmail, setInviteEmail] = useState("");

  // For creating a new org if none exists
  const [createName, setCreateName] = useState("");
  const [createSlug, setCreateSlug] = useState("");

  const fetchOrg = async () => {
    setLoading(true);
    try {
      const resp = await api.get("/api/organizations/mine");
      if (resp.ok) {
        const data = await resp.json();
        setOrg(data);
        setEditName(data.name);
        setEditMaxMembers(data.settings?.maxMembers || 5);
      }
    } catch {
      // no org
    } finally {
      setLoading(false);
    }
  };

  const fetchMembers = async () => {
    if (!organizationId) return;
    try {
      const resp = await api.get("/api/users");
      if (resp.ok) setMembers(await resp.json());
    } catch {
      // silent
    }
  };

  useEffect(() => {
    fetchOrg();
    fetchMembers();
  }, [organizationId]);

  const handleSave = async () => {
    if (!org) return;
    const resp = await api.put(`/api/organizations/${org._id}`, {
      name: editName,
      settings: { maxMembers: editMaxMembers },
    });
    if (resp.ok) {
      toast({ title: "Organization updated" });
      fetchOrg();
    } else {
      const data = await resp.json();
      toast({ title: "Error", description: data.error, variant: "destructive" });
    }
  };

  const handleCreate = async () => {
    if (!createName.trim() || !createSlug.trim()) {
      toast({ title: "Error", description: "Name and slug required", variant: "destructive" });
      return;
    }
    const resp = await api.post("/api/organizations", {
      name: createName,
      slug: createSlug,
    });
    if (resp.ok) {
      toast({ title: "Organization created! Please log in again for changes to take effect." });
      fetchOrg();
    } else {
      const data = await resp.json();
      toast({ title: "Error", description: data.error, variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!org) return;
    if (!window.confirm("Are you sure you want to delete this organization? This action cannot be undone.")) return;
    const resp = await api.delete(`/api/organizations/${org._id}`);
    if (resp.ok) {
      toast({ title: "Organization deleted" });
      setOrg(null);
    } else {
      const data = await resp.json();
      toast({ title: "Error", description: data.error, variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <p className="text-muted-foreground">Loading...</p>
      </AdminLayout>
    );
  }

  if (!org) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Building className="h-8 w-8" />
              Create Organization
            </h1>
            <p className="text-muted-foreground mt-1">
              Set up your workspace
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>New Organization</CardTitle>
              <CardDescription>Create an organization to manage your team</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Organization Name</label>
                <Input
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  placeholder="My Organization"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Slug</label>
                <Input
                  value={createSlug}
                  onChange={(e) => setCreateSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))}
                  placeholder="my-org"
                />
                <p className="text-xs text-muted-foreground mt-1">URL-friendly identifier</p>
              </div>
              <Button onClick={handleCreate}>Create Organization</Button>
            </CardContent>
          </Card>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Building className="h-8 w-8" />
            Organization Settings
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage {org.name}
            <Badge variant="outline" className="ml-2">{org.plan}</Badge>
          </p>
        </div>

        {/* General Settings */}
        <Card>
          <CardHeader>
            <CardTitle>General</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Organization Name</label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">Slug</label>
              <Input value={org.slug} disabled />
            </div>
            <div>
              <label className="text-sm font-medium">Max Members</label>
              <Input
                type="number"
                value={editMaxMembers}
                onChange={(e) => setEditMaxMembers(Number(e.target.value))}
                min={1}
                max={1000}
              />
            </div>
            <Button onClick={handleSave}>
              <Save className="h-4 w-4 mr-1" />
              Save Changes
            </Button>
          </CardContent>
        </Card>

        {/* Members */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Members ({members.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {members.length === 0 ? (
              <p className="text-muted-foreground">No members found</p>
            ) : (
              <div className="space-y-2">
                {members.map((m) => (
                  <div
                    key={m._id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-medium">{m.email}</span>
                      <Badge variant="outline" className="capitalize">{m.role}</Badge>
                      {m.suspended && <Badge variant="destructive">Suspended</Badge>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="text-destructive">Danger Zone</CardTitle>
          </CardHeader>
          <CardContent>
            <Button variant="destructive" onClick={handleDelete}>
              <Trash2 className="h-4 w-4 mr-1" />
              Delete Organization
            </Button>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
