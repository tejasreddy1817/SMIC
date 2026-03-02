import { useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Settings,
  Globe,
  Shield,
  Mail,
  Bell,
  Database,
  Palette,
  Loader2,
  Check,
  Server,
  Lock,
  Image,
  FileText,
} from "lucide-react";

export default function GeneralSettings() {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  // App settings
  const [appName, setAppName] = useState("SMIC");
  const [appDescription, setAppDescription] = useState("AI-powered content intelligence platform for creators");
  const [supportEmail, setSupportEmail] = useState("support@thesmic.com");
  const [defaultLanguage, setDefaultLanguage] = useState("en");
  const [timezone, setTimezone] = useState("Asia/Kolkata");

  // Feature toggles
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [registrationOpen, setRegistrationOpen] = useState(true);
  const [onboardingRequired, setOnboardingRequired] = useState(true);
  const [chatbotEnabled, setChatbotEnabled] = useState(true);
  const [instagramOAuth, setInstagramOAuth] = useState(true);
  const [emailVerification, setEmailVerification] = useState(true);

  // Content settings
  const [maxUploadSize, setMaxUploadSize] = useState("50");
  const [allowedFormats, setAllowedFormats] = useState("mp4,mov,jpg,png,gif");
  const [maxPipelineRuns, setMaxPipelineRuns] = useState("100");
  const [rateLimitGeneral, setRateLimitGeneral] = useState("200");
  const [rateLimitAuth, setRateLimitAuth] = useState("20");

  // Notification settings
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [slackWebhook, setSlackWebhook] = useState("");
  const [alertOnFailure, setAlertOnFailure] = useState(true);
  const [alertOnNewUser, setAlertOnNewUser] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    // Simulate save
    await new Promise((r) => setTimeout(r, 1000));
    setSaving(false);
    toast({ title: "Settings saved", description: "Configuration has been updated." });
  };

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-4xl">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Settings className="h-8 w-8" />
            General Settings
          </h1>
          <p className="text-muted-foreground mt-1">Configure platform-wide settings and preferences</p>
        </div>

        {/* App Info */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-primary" />
              <CardTitle>Application</CardTitle>
            </div>
            <CardDescription>Basic application configuration</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="appName">App Name</Label>
                <Input id="appName" value={appName} onChange={(e) => setAppName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="supportEmail">Support Email</Label>
                <Input id="supportEmail" type="email" value={supportEmail} onChange={(e) => setSupportEmail(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="appDesc">Description</Label>
              <Textarea id="appDesc" value={appDescription} onChange={(e) => setAppDescription(e.target.value)} rows={2} />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Default Language</Label>
                <Select value={defaultLanguage} onValueChange={setDefaultLanguage}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="hi">Hindi</SelectItem>
                    <SelectItem value="ta">Tamil</SelectItem>
                    <SelectItem value="te">Telugu</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Timezone</Label>
                <Select value={timezone} onValueChange={setTimezone}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Asia/Kolkata">Asia/Kolkata (IST)</SelectItem>
                    <SelectItem value="America/New_York">America/New_York (EST)</SelectItem>
                    <SelectItem value="Europe/London">Europe/London (GMT)</SelectItem>
                    <SelectItem value="Asia/Tokyo">Asia/Tokyo (JST)</SelectItem>
                    <SelectItem value="UTC">UTC</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Feature Toggles */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-orange-500" />
              <CardTitle>Feature Toggles</CardTitle>
            </div>
            <CardDescription>Enable or disable platform features</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Maintenance Mode</Label>
                <p className="text-xs text-muted-foreground">Temporarily disable access for all users</p>
              </div>
              <div className="flex items-center gap-2">
                {maintenanceMode && <Badge variant="destructive">Active</Badge>}
                <Switch checked={maintenanceMode} onCheckedChange={setMaintenanceMode} />
              </div>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <Label>Open Registration</Label>
                <p className="text-xs text-muted-foreground">Allow new users to sign up</p>
              </div>
              <Switch checked={registrationOpen} onCheckedChange={setRegistrationOpen} />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <Label>Onboarding Required</Label>
                <p className="text-xs text-muted-foreground">Require creators to complete onboarding</p>
              </div>
              <Switch checked={onboardingRequired} onCheckedChange={setOnboardingRequired} />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <Label>AI Chatbot</Label>
                <p className="text-xs text-muted-foreground">Enable the in-app AI assistant</p>
              </div>
              <Switch checked={chatbotEnabled} onCheckedChange={setChatbotEnabled} />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <Label>Instagram OAuth</Label>
                <p className="text-xs text-muted-foreground">Allow Instagram login integration</p>
              </div>
              <Switch checked={instagramOAuth} onCheckedChange={setInstagramOAuth} />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <Label>Email Verification</Label>
                <p className="text-xs text-muted-foreground">Require email verification on signup</p>
              </div>
              <Switch checked={emailVerification} onCheckedChange={setEmailVerification} />
            </div>
          </CardContent>
        </Card>

        {/* Content & Limits */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Server className="h-5 w-5 text-blue-500" />
              <CardTitle>Limits & Rate Limiting</CardTitle>
            </div>
            <CardDescription>Configure upload limits and API rate limits</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Max Upload Size (MB)</Label>
                <Input type="number" value={maxUploadSize} onChange={(e) => setMaxUploadSize(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Max Pipeline Runs / Day / User</Label>
                <Input type="number" value={maxPipelineRuns} onChange={(e) => setMaxPipelineRuns(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Allowed File Formats</Label>
              <Input value={allowedFormats} onChange={(e) => setAllowedFormats(e.target.value)} placeholder="mp4,mov,jpg,png,gif" />
              <p className="text-xs text-muted-foreground">Comma-separated list of file extensions</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>General Rate Limit (req/15min)</Label>
                <Input type="number" value={rateLimitGeneral} onChange={(e) => setRateLimitGeneral(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Auth Rate Limit (req/15min)</Label>
                <Input type="number" value={rateLimitAuth} onChange={(e) => setRateLimitAuth(e.target.value)} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-green-500" />
              <CardTitle>Admin Notifications</CardTitle>
            </div>
            <CardDescription>Configure how admins receive alerts</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Email Notifications</Label>
                <p className="text-xs text-muted-foreground">Send admin alerts via email</p>
              </div>
              <Switch checked={emailNotifications} onCheckedChange={setEmailNotifications} />
            </div>
            <Separator />
            <div className="space-y-2">
              <Label>Slack Webhook URL</Label>
              <Input
                type="url"
                value={slackWebhook}
                onChange={(e) => setSlackWebhook(e.target.value)}
                placeholder="https://hooks.slack.com/services/..."
              />
              <p className="text-xs text-muted-foreground">Optional: Receive alerts in Slack</p>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <Label>Alert on Pipeline Failure</Label>
                <p className="text-xs text-muted-foreground">Get notified when pipeline jobs fail</p>
              </div>
              <Switch checked={alertOnFailure} onCheckedChange={setAlertOnFailure} />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <Label>Alert on New User Signup</Label>
                <p className="text-xs text-muted-foreground">Get notified for each new registration</p>
              </div>
              <Switch checked={alertOnNewUser} onCheckedChange={setAlertOnNewUser} />
            </div>
          </CardContent>
        </Card>

        {/* Save */}
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving} size="lg">
            {saving ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</>
            ) : (
              <><Check className="mr-2 h-4 w-4" /> Save Settings</>
            )}
          </Button>
        </div>
      </div>
    </AdminLayout>
  );
}
