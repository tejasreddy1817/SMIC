import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { ToggleLeft, Plus } from "lucide-react";

export default function FeatureFlags() {
  const { toast } = useToast();
  const [features, setFeatures] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [newFlagName, setNewFlagName] = useState("");

  const fetchFlags = async () => {
    setLoading(true);
    try {
      const resp = await api.get("/api/admin/feature-flags");
      if (resp.ok) {
        const data = await resp.json();
        setFeatures(data.features || {});
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFlags();
  }, []);

  const toggleFlag = async (name: string, value: boolean) => {
    const updated = { ...features, [name]: value };
    const resp = await api.put("/api/admin/feature-flags", { features: { [name]: value } });
    if (resp.ok) {
      setFeatures(updated);
      toast({ title: `Feature "${name}" ${value ? "enabled" : "disabled"}` });
    } else {
      const data = await resp.json();
      toast({ title: "Error", description: data.error, variant: "destructive" });
    }
  };

  const addFlag = async () => {
    const name = newFlagName.trim().toLowerCase().replace(/\s+/g, "_");
    if (!name) return;
    if (features[name] !== undefined) {
      toast({ title: "Error", description: "Flag already exists", variant: "destructive" });
      return;
    }
    await toggleFlag(name, false);
    setNewFlagName("");
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <ToggleLeft className="h-8 w-8" />
            Feature Flags
          </h1>
          <p className="text-muted-foreground mt-1">
            Toggle features on and off for the organization
          </p>
        </div>

        {/* Add new flag */}
        <Card>
          <CardHeader>
            <CardTitle>Add Feature Flag</CardTitle>
            <CardDescription>Create a new feature flag</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input
                placeholder="Flag name (e.g. new_dashboard)"
                value={newFlagName}
                onChange={(e) => setNewFlagName(e.target.value)}
                className="max-w-sm"
                onKeyDown={(e) => e.key === "Enter" && addFlag()}
              />
              <Button onClick={addFlag} disabled={!newFlagName.trim()}>
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Existing flags */}
        <Card>
          <CardHeader>
            <CardTitle>Current Flags</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-muted-foreground">Loading...</p>
            ) : Object.keys(features).length === 0 ? (
              <p className="text-muted-foreground">No feature flags configured</p>
            ) : (
              <div className="space-y-4">
                {Object.entries(features)
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([name, enabled]) => (
                    <div
                      key={name}
                      className="flex items-center justify-between rounded-lg border p-4"
                    >
                      <div>
                        <p className="font-medium font-mono">{name}</p>
                        <p className="text-sm text-muted-foreground">
                          {enabled ? "Enabled" : "Disabled"}
                        </p>
                      </div>
                      <Switch
                        checked={enabled}
                        onCheckedChange={(val) => toggleFlag(name, val)}
                      />
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
