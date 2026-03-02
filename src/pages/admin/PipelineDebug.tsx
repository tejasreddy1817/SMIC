import { useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Cpu,
  Play,
  Square,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  Activity,
  Search,
  Terminal,
  Loader2,
  AlertTriangle,
  Zap,
} from "lucide-react";

interface PipelineRun {
  id: string;
  userId: string;
  email: string;
  status: "completed" | "running" | "failed" | "queued";
  stages: { name: string; status: "completed" | "running" | "failed" | "pending"; durationMs?: number }[];
  startedAt: string;
  completedAt?: string;
  totalDurationMs?: number;
  error?: string;
}

const MOCK_RUNS: PipelineRun[] = [
  {
    id: "run_001", userId: "u1", email: "creator1@gmail.com", status: "completed",
    stages: [
      { name: "Trends", status: "completed", durationMs: 2100 },
      { name: "Ideas", status: "completed", durationMs: 3400 },
      { name: "Scripts", status: "completed", durationMs: 5200 },
      { name: "Predict", status: "completed", durationMs: 1800 },
    ],
    startedAt: "2026-02-25T10:30:00Z", completedAt: "2026-02-25T10:30:12Z", totalDurationMs: 12500,
  },
  {
    id: "run_002", userId: "u2", email: "creator2@gmail.com", status: "running",
    stages: [
      { name: "Trends", status: "completed", durationMs: 1900 },
      { name: "Ideas", status: "completed", durationMs: 2800 },
      { name: "Scripts", status: "running" },
      { name: "Predict", status: "pending" },
    ],
    startedAt: "2026-02-25T10:32:00Z",
  },
  {
    id: "run_003", userId: "u3", email: "creator3@gmail.com", status: "failed",
    stages: [
      { name: "Trends", status: "completed", durationMs: 2400 },
      { name: "Ideas", status: "failed", durationMs: 1200 },
      { name: "Scripts", status: "pending" },
      { name: "Predict", status: "pending" },
    ],
    startedAt: "2026-02-25T10:28:00Z", completedAt: "2026-02-25T10:28:04Z", totalDurationMs: 3600,
    error: "Ideas generation failed: Rate limit exceeded for OpenAI API",
  },
  {
    id: "run_004", userId: "u4", email: "user4@gmail.com", status: "queued",
    stages: [
      { name: "Trends", status: "pending" },
      { name: "Ideas", status: "pending" },
      { name: "Scripts", status: "pending" },
      { name: "Predict", status: "pending" },
    ],
    startedAt: "2026-02-25T10:33:00Z",
  },
  {
    id: "run_005", userId: "u5", email: "creator5@gmail.com", status: "completed",
    stages: [
      { name: "Trends", status: "completed", durationMs: 1800 },
      { name: "Ideas", status: "completed", durationMs: 3100 },
      { name: "Scripts", status: "completed", durationMs: 4600 },
      { name: "Predict", status: "completed", durationMs: 1500 },
    ],
    startedAt: "2026-02-25T10:20:00Z", completedAt: "2026-02-25T10:20:11Z", totalDurationMs: 11000,
  },
];

const stageStatusConfig: Record<string, { color: string; icon: any }> = {
  completed: { color: "text-green-500", icon: CheckCircle2 },
  running: { color: "text-blue-500", icon: Loader2 },
  failed: { color: "text-red-500", icon: XCircle },
  pending: { color: "text-muted-foreground", icon: Clock },
};

const runStatusConfig: Record<string, { color: string; icon: any; badge: string }> = {
  completed: { color: "bg-green-500/10 text-green-500 border-green-500/20", icon: CheckCircle2, badge: "Completed" },
  running: { color: "bg-blue-500/10 text-blue-500 border-blue-500/20", icon: Loader2, badge: "Running" },
  failed: { color: "bg-red-500/10 text-red-500 border-red-500/20", icon: XCircle, badge: "Failed" },
  queued: { color: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20", icon: Clock, badge: "Queued" },
};

export default function PipelineDebug() {
  const [runs] = useState<PipelineRun[]>(MOCK_RUNS);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  const filtered = runs.filter((r) => {
    if (filterStatus !== "all" && r.status !== filterStatus) return false;
    if (search && !r.email.toLowerCase().includes(search.toLowerCase()) && !r.id.includes(search)) return false;
    return true;
  });

  const stats = {
    total: runs.length,
    running: runs.filter((r) => r.status === "running").length,
    failed: runs.filter((r) => r.status === "failed").length,
    avgDuration: Math.round(runs.filter((r) => r.totalDurationMs).reduce((a, r) => a + (r.totalDurationMs || 0), 0) / runs.filter((r) => r.totalDurationMs).length / 1000 * 10) / 10,
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Cpu className="h-8 w-8" />
            Pipeline Debug
          </h1>
          <p className="text-muted-foreground mt-1">Monitor and debug content pipeline runs</p>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Runs</CardTitle>
              <Zap className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent><div className="text-2xl font-bold">{stats.total}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Running</CardTitle>
              <Activity className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent><div className="text-2xl font-bold">{stats.running}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Failed</CardTitle>
              <XCircle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent><div className="text-2xl font-bold">{stats.failed}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Avg Duration</CardTitle>
              <Clock className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent><div className="text-2xl font-bold">{stats.avgDuration}s</div></CardContent>
          </Card>
        </div>

        <div className="flex gap-4 items-center">
          <div className="relative max-w-sm flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search by email or run ID..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="running">Running</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="queued">Queued</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-3">
          {filtered.map((run) => {
            const conf = runStatusConfig[run.status];
            const StatusIcon = conf.icon;
            return (
              <Card key={run.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{run.email}</span>
                        <Badge variant="outline" className={conf.color}>
                          <StatusIcon className={`h-3 w-3 mr-1 ${run.status === "running" ? "animate-spin" : ""}`} />
                          {conf.badge}
                        </Badge>
                      </div>
                      <span className="text-xs text-muted-foreground">{run.id} | Started: {new Date(run.startedAt).toLocaleTimeString()}</span>
                    </div>
                    <div className="text-right">
                      {run.totalDurationMs && <span className="text-sm font-medium">{(run.totalDurationMs / 1000).toFixed(1)}s</span>}
                      {run.status === "failed" && (
                        <Button size="sm" variant="outline" className="ml-2"><RefreshCw className="h-3 w-3 mr-1" />Retry</Button>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {run.stages.map((stage, i) => {
                      const sc = stageStatusConfig[stage.status];
                      const StageIcon = sc.icon;
                      return (
                        <div key={stage.name} className="flex items-center gap-2 flex-1">
                          <div className="flex items-center gap-1.5 flex-1 rounded-lg border p-2">
                            <StageIcon className={`h-4 w-4 shrink-0 ${sc.color} ${stage.status === "running" ? "animate-spin" : ""}`} />
                            <div className="min-w-0">
                              <span className="text-xs font-medium">{stage.name}</span>
                              {stage.durationMs && <span className="text-[10px] text-muted-foreground ml-1">({(stage.durationMs / 1000).toFixed(1)}s)</span>}
                            </div>
                          </div>
                          {i < run.stages.length - 1 && <span className="text-muted-foreground/30">→</span>}
                        </div>
                      );
                    })}
                  </div>
                  {run.error && (
                    <div className="mt-2 flex items-start gap-2 rounded-lg bg-red-500/10 p-2 text-sm text-red-500">
                      <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                      {run.error}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </AdminLayout>
  );
}
