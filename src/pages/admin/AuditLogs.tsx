import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { FileSearch, Clock } from "lucide-react";

interface AuditRecord {
  _id: string;
  actor?: { email?: string; role?: string } | string;
  action: string;
  target?: { email?: string; role?: string } | string;
  details?: Record<string, any>;
  ip?: string;
  createdAt: string;
}

export default function AuditLogs() {
  const { hasPermission } = useAuth();
  const [logs, setLogs] = useState<AuditRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterAction, setFilterAction] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const endpoint = hasPermission("audit:read:any")
          ? "/api/admin/audit-logs"
          : "/api/admin/audit-logs/mine";
        const resp = await api.get(endpoint);
        if (resp.ok) setLogs(await resp.json());
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = filterAction
    ? logs.filter((l) => l.action.toLowerCase().includes(filterAction.toLowerCase()))
    : logs;

  const getActorLabel = (actor: AuditRecord["actor"]) => {
    if (!actor) return "System";
    if (typeof actor === "string") return actor.slice(-6);
    return actor.email || "Unknown";
  };

  const getTargetLabel = (target: AuditRecord["target"]) => {
    if (!target) return "-";
    if (typeof target === "string") return target.slice(-6);
    return target.email || target.toString();
  };

  const actionColor = (action: string) => {
    if (action.includes("delete") || action.includes("suspend")) return "text-red-500";
    if (action.includes("create") || action.includes("reactivate")) return "text-green-500";
    if (action.includes("update") || action.includes("role")) return "text-yellow-500";
    return "text-blue-500";
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <FileSearch className="h-8 w-8" />
            Audit Logs
          </h1>
          <p className="text-muted-foreground mt-1">
            System activity and change history
          </p>
        </div>

        <Input
          placeholder="Filter by action (e.g. user:role:update)..."
          value={filterAction}
          onChange={(e) => setFilterAction(e.target.value)}
          className="max-w-md"
        />

        <Card>
          <CardHeader>
            <CardTitle>Activity Log ({filtered.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-muted-foreground">Loading...</p>
            ) : filtered.length === 0 ? (
              <p className="text-muted-foreground">No audit logs found</p>
            ) : (
              <div className="space-y-2">
                {filtered.map((log) => (
                  <div
                    key={log._id}
                    className="flex items-start justify-between rounded-lg border p-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={actionColor(log.action)}>
                          {log.action}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>Actor: {getActorLabel(log.actor)}</span>
                        <span>Target: {getTargetLabel(log.target)}</span>
                        {log.ip && <span>IP: {log.ip}</span>}
                      </div>
                      {log.details && Object.keys(log.details).length > 0 && (
                        <pre className="text-xs text-muted-foreground mt-1 bg-muted rounded p-2 max-w-lg overflow-x-auto">
                          {JSON.stringify(log.details, null, 2)}
                        </pre>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                      <Clock className="h-3 w-3" />
                      {new Date(log.createdAt).toLocaleString()}
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
