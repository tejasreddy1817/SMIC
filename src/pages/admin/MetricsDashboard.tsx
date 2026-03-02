import { useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Activity,
  Cpu,
  HardDrive,
  Wifi,
  Clock,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Server,
  Database,
  Zap,
  Users,
  Calendar,
} from "lucide-react";

interface SystemMetric {
  label: string;
  value: string;
  change: string;
  changeType: "up" | "down" | "neutral";
  icon: any;
  color: string;
}

interface EndpointMetric {
  path: string;
  method: string;
  avgResponseMs: number;
  p99ResponseMs: number;
  requestsPerMin: number;
  errorRate: number;
}

const SYSTEM_METRICS: SystemMetric[] = [
  { label: "CPU Usage", value: "42%", change: "-3%", changeType: "down", icon: Cpu, color: "text-blue-500" },
  { label: "Memory Usage", value: "68%", change: "+2%", changeType: "up", icon: HardDrive, color: "text-purple-500" },
  { label: "Avg Response Time", value: "145ms", change: "-12ms", changeType: "down", icon: Clock, color: "text-green-500" },
  { label: "Uptime", value: "99.97%", change: "+0.02%", changeType: "up", icon: Activity, color: "text-emerald-500" },
  { label: "Active Connections", value: "1,247", change: "+89", changeType: "up", icon: Wifi, color: "text-orange-500" },
  { label: "Queue Depth", value: "23", change: "-5", changeType: "down", icon: Server, color: "text-cyan-500" },
  { label: "DB Queries/min", value: "3,420", change: "+180", changeType: "up", icon: Database, color: "text-yellow-500" },
  { label: "Pipeline Runs/hr", value: "142", change: "+18", changeType: "up", icon: Zap, color: "text-primary" },
];

const ENDPOINT_METRICS: EndpointMetric[] = [
  { path: "/api/pipeline/trends", method: "POST", avgResponseMs: 2100, p99ResponseMs: 4500, requestsPerMin: 45, errorRate: 0.8 },
  { path: "/api/pipeline/ideas", method: "POST", avgResponseMs: 3200, p99ResponseMs: 6800, requestsPerMin: 38, errorRate: 1.2 },
  { path: "/api/pipeline/scripts", method: "POST", avgResponseMs: 4800, p99ResponseMs: 9200, requestsPerMin: 32, errorRate: 0.5 },
  { path: "/api/pipeline/predict", method: "POST", avgResponseMs: 1600, p99ResponseMs: 3100, requestsPerMin: 28, errorRate: 0.3 },
  { path: "/api/auth/login", method: "POST", avgResponseMs: 85, p99ResponseMs: 220, requestsPerMin: 120, errorRate: 2.1 },
  { path: "/api/users", method: "GET", avgResponseMs: 45, p99ResponseMs: 120, requestsPerMin: 95, errorRate: 0.1 },
  { path: "/api/trends", method: "GET", avgResponseMs: 180, p99ResponseMs: 450, requestsPerMin: 210, errorRate: 0.4 },
  { path: "/api/media/upload", method: "POST", avgResponseMs: 850, p99ResponseMs: 2400, requestsPerMin: 15, errorRate: 3.2 },
];

export default function MetricsDashboard() {
  const [timeRange, setTimeRange] = useState("1h");

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Activity className="h-8 w-8" />
              System Metrics
            </h1>
            <p className="text-muted-foreground mt-1">Real-time system performance and health monitoring</p>
          </div>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-36">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="5m">Last 5 min</SelectItem>
              <SelectItem value="1h">Last 1 hour</SelectItem>
              <SelectItem value="24h">Last 24 hours</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* System Metrics Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {SYSTEM_METRICS.map((metric) => {
            const Icon = metric.icon;
            return (
              <Card key={metric.label}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">{metric.label}</CardTitle>
                  <Icon className={`h-4 w-4 ${metric.color}`} />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{metric.value}</div>
                  <div className={`text-xs flex items-center gap-1 mt-1 ${metric.changeType === "down" ? "text-green-500" : metric.changeType === "up" ? "text-blue-500" : "text-muted-foreground"}`}>
                    {metric.changeType === "up" ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                    {metric.change} from prev period
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* API Endpoint Performance */}
        <Card>
          <CardHeader>
            <CardTitle>API Endpoint Performance</CardTitle>
            <CardDescription>Response times, throughput, and error rates by endpoint</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="grid grid-cols-[1fr_60px_90px_90px_80px_80px] gap-2 text-xs font-medium text-muted-foreground px-4 pb-2 border-b">
                <span>Endpoint</span>
                <span>Method</span>
                <span>Avg (ms)</span>
                <span>P99 (ms)</span>
                <span>Req/min</span>
                <span>Error %</span>
              </div>
              {ENDPOINT_METRICS.map((ep) => (
                <div key={ep.path} className="grid grid-cols-[1fr_60px_90px_90px_80px_80px] gap-2 items-center rounded-lg border p-4 hover:bg-muted/30">
                  <code className="text-sm">{ep.path}</code>
                  <Badge variant="outline" className="text-xs w-fit">{ep.method}</Badge>
                  <span className={`text-sm font-medium ${ep.avgResponseMs > 3000 ? "text-yellow-500" : "text-green-500"}`}>{ep.avgResponseMs}</span>
                  <span className={`text-sm font-medium ${ep.p99ResponseMs > 5000 ? "text-red-500" : "text-muted-foreground"}`}>{ep.p99ResponseMs}</span>
                  <span className="text-sm">{ep.requestsPerMin}</span>
                  <span className={`text-sm font-medium ${ep.errorRate > 2 ? "text-red-500" : ep.errorRate > 1 ? "text-yellow-500" : "text-green-500"}`}>{ep.errorRate}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
