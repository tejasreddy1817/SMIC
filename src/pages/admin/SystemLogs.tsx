import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { Terminal, RefreshCw, Clock } from "lucide-react";

interface LogEntry {
  _id: string;
  action: string;
  actor?: string;
  details?: Record<string, any>;
  ip?: string;
  createdAt: string;
}

export default function SystemLogs() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const resp = await api.get("/api/admin/logs?limit=100");
      if (resp.ok) setLogs(await resp.json());
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Terminal className="h-8 w-8" />
              System Logs
            </h1>
            <p className="text-muted-foreground mt-1">
              Application activity and diagnostic logs
            </p>
          </div>
          <Button variant="outline" onClick={fetchLogs} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity ({logs.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-muted-foreground">Loading logs...</p>
            ) : logs.length === 0 ? (
              <p className="text-muted-foreground">No logs available</p>
            ) : (
              <div className="space-y-1 font-mono text-sm">
                {logs.map((log) => (
                  <div
                    key={log._id}
                    className="flex items-start gap-3 py-2 border-b border-border/50 last:border-0"
                  >
                    <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0 w-40">
                      <Clock className="h-3 w-3" />
                      {new Date(log.createdAt).toLocaleString()}
                    </div>
                    <Badge variant="outline" className="shrink-0 text-xs">
                      {log.action}
                    </Badge>
                    <span className="text-muted-foreground truncate">
                      {log.details
                        ? JSON.stringify(log.details).slice(0, 100)
                        : "-"}
                    </span>
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
