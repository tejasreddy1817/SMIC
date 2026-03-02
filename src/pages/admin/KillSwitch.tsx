import { useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  Power,
  AlertTriangle,
  Shield,
  ShieldOff,
  Zap,
  Users,
  Globe,
  Database,
  Server,
  Lock,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface KillSwitchItem {
  id: string;
  label: string;
  description: string;
  icon: any;
  active: boolean;
  severity: "critical" | "high" | "medium";
  lastTriggered?: string;
}

const KILL_SWITCHES: KillSwitchItem[] = [
  { id: "maintenance", label: "Full Maintenance Mode", description: "Shut down all user access. Only founders can access the platform.", icon: Power, active: false, severity: "critical" },
  { id: "registration", label: "Disable Registration", description: "Block all new user signups immediately.", icon: Users, active: false, severity: "high" },
  { id: "pipeline", label: "Disable Pipeline", description: "Stop all AI content generation pipelines (trends, ideas, scripts, predict).", icon: Zap, active: false, severity: "high" },
  { id: "external_api", label: "Disable External APIs", description: "Cut all outbound API calls (OpenAI, Instagram, etc).", icon: Globe, active: false, severity: "high" },
  { id: "uploads", label: "Disable Uploads", description: "Block all media file uploads.", icon: Database, active: false, severity: "medium" },
  { id: "webhooks", label: "Disable Webhooks", description: "Stop all outbound webhook notifications.", icon: Server, active: false, severity: "medium" },
];

const severityConfig: Record<string, { color: string; bg: string }> = {
  critical: { color: "text-red-500", bg: "bg-red-500/10 border-red-500/20" },
  high: { color: "text-orange-500", bg: "bg-orange-500/10 border-orange-500/20" },
  medium: { color: "text-yellow-500", bg: "bg-yellow-500/10 border-yellow-500/20" },
};

export default function KillSwitch() {
  const { toast } = useToast();
  const [switches, setSwitches] = useState<KillSwitchItem[]>(KILL_SWITCHES);
  const [confirmText, setConfirmText] = useState("");
  const [pendingSwitch, setPendingSwitch] = useState<string | null>(null);

  const activeCount = switches.filter((s) => s.active).length;

  const toggleSwitch = (id: string) => {
    const sw = switches.find((s) => s.id === id);
    if (!sw) return;

    if (!sw.active && sw.severity === "critical") {
      setPendingSwitch(id);
      setConfirmText("");
      return;
    }

    setSwitches((prev) =>
      prev.map((s) => (s.id === id ? { ...s, active: !s.active, lastTriggered: new Date().toISOString() } : s))
    );
    toast({
      title: sw.active ? `${sw.label} deactivated` : `${sw.label} activated`,
      description: sw.active ? "Service resumed." : "Service has been shut down.",
      variant: sw.active ? "default" : "destructive",
    });
  };

  const confirmCriticalSwitch = () => {
    if (confirmText !== "CONFIRM" || !pendingSwitch) return;
    setSwitches((prev) =>
      prev.map((s) => (s.id === pendingSwitch ? { ...s, active: true, lastTriggered: new Date().toISOString() } : s))
    );
    toast({ title: "Critical kill switch activated", variant: "destructive" });
    setPendingSwitch(null);
    setConfirmText("");
  };

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-4xl">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Power className="h-8 w-8" />
            Kill Switch
          </h1>
          <p className="text-muted-foreground mt-1">Emergency controls to shut down platform services</p>
        </div>

        {/* Warning Banner */}
        <Card className="border-red-500/30 bg-red-500/5">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-500">Danger Zone</p>
              <p className="text-sm text-muted-foreground">
                These controls immediately affect all users. Critical switches require typed confirmation.
                Use only in emergencies.
              </p>
            </div>
            {activeCount > 0 && (
              <Badge variant="destructive" className="ml-auto shrink-0">{activeCount} Active</Badge>
            )}
          </CardContent>
        </Card>

        {/* Confirmation Dialog for Critical */}
        {pendingSwitch && (
          <Card className="border-red-500/50">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-2">
                <ShieldOff className="h-5 w-5 text-red-500" />
                <span className="font-semibold text-red-500">Confirm Critical Action</span>
              </div>
              <p className="text-sm text-muted-foreground">
                You are about to activate <strong>{switches.find((s) => s.id === pendingSwitch)?.label}</strong>.
                This will immediately affect all users. Type <strong>CONFIRM</strong> to proceed.
              </p>
              <div className="flex gap-2">
                <Input
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder='Type "CONFIRM"'
                  className="max-w-xs"
                />
                <Button variant="destructive" disabled={confirmText !== "CONFIRM"} onClick={confirmCriticalSwitch}>
                  Activate
                </Button>
                <Button variant="outline" onClick={() => setPendingSwitch(null)}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Kill Switches */}
        <div className="space-y-3">
          {switches.map((sw) => {
            const Icon = sw.icon;
            const sev = severityConfig[sw.severity];
            return (
              <Card key={sw.id} className={cn(sw.active && "border-red-500/50 bg-red-500/5")}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg border", sev.bg)}>
                        <Icon className={cn("h-5 w-5", sev.color)} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{sw.label}</span>
                          <Badge variant="outline" className={cn("text-xs capitalize", sev.bg, sev.color)}>
                            {sw.severity}
                          </Badge>
                          {sw.active && <Badge variant="destructive">ACTIVE</Badge>}
                        </div>
                        <p className="text-sm text-muted-foreground">{sw.description}</p>
                        {sw.lastTriggered && (
                          <span className="text-xs text-muted-foreground">
                            Last triggered: {new Date(sw.lastTriggered).toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>
                    <Switch
                      checked={sw.active}
                      onCheckedChange={() => toggleSwitch(sw.id)}
                      className={cn(sw.active && "data-[state=checked]:bg-red-500")}
                    />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </AdminLayout>
  );
}
