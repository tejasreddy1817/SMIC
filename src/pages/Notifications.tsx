import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Bell,
  BellOff,
  CheckCircle2,
  TrendingUp,
  AlertTriangle,
  Info,
  Sparkles,
  Film,
  Users,
  Zap,
  Check,
  Trash2,
  Settings,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";

type NotificationType = "info" | "success" | "warning" | "trend" | "content" | "system";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  read: boolean;
  createdAt: string;
  actionUrl?: string;
  actionLabel?: string;
}

const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: "1",
    title: "Reel is Trending!",
    message: "Your reel '5 AI Tools Every Creator Needs' has crossed 10K views.",
    type: "trend",
    read: false,
    createdAt: "2026-02-23T14:30:00Z",
    actionUrl: "/status",
    actionLabel: "View Stats",
  },
  {
    id: "2",
    title: "New Trend Detected",
    message: "A trending topic in your niche 'Tech' is gaining momentum. Generate ideas now!",
    type: "trend",
    read: false,
    createdAt: "2026-02-23T12:00:00Z",
    actionUrl: "/trends",
    actionLabel: "Explore Trends",
  },
  {
    id: "3",
    title: "Content Published",
    message: "Your scheduled video 'Morning Routine for Productivity' has been published successfully.",
    type: "success",
    read: false,
    createdAt: "2026-02-22T09:00:00Z",
    actionUrl: "/status",
    actionLabel: "View Content",
  },
  {
    id: "4",
    title: "Upload Failed",
    message: "Failed to upload 'BTS Story' due to a network error. Please retry.",
    type: "warning",
    read: true,
    createdAt: "2026-02-21T16:30:00Z",
    actionUrl: "/status",
    actionLabel: "Retry Upload",
  },
  {
    id: "5",
    title: "Script Generated",
    message: "Your AI script for 'Top 10 Coding Shortcuts' is ready for review.",
    type: "content",
    read: true,
    createdAt: "2026-02-21T10:00:00Z",
    actionUrl: "/scripts",
    actionLabel: "Review Script",
  },
  {
    id: "6",
    title: "Welcome to SMIC!",
    message: "Your account has been set up. Start by discovering trends in your niche.",
    type: "info",
    read: true,
    createdAt: "2026-02-20T08:00:00Z",
    actionUrl: "/trends",
    actionLabel: "Get Started",
  },
  {
    id: "7",
    title: "Platform Update",
    message: "New features available: Content Calendar and Status Tracking are now live.",
    type: "system",
    read: true,
    createdAt: "2026-02-19T12:00:00Z",
  },
  {
    id: "8",
    title: "Prediction Alert",
    message: "Your latest script scored 85% viral probability. Consider posting during peak hours.",
    type: "content",
    read: false,
    createdAt: "2026-02-23T11:00:00Z",
    actionUrl: "/predict",
    actionLabel: "View Prediction",
  },
];

const typeConfig: Record<NotificationType, { icon: any; color: string; bgColor: string }> = {
  info: { icon: Info, color: "text-blue-500", bgColor: "bg-blue-500/10" },
  success: { icon: CheckCircle2, color: "text-green-500", bgColor: "bg-green-500/10" },
  warning: { icon: AlertTriangle, color: "text-yellow-500", bgColor: "bg-yellow-500/10" },
  trend: { icon: TrendingUp, color: "text-purple-500", bgColor: "bg-purple-500/10" },
  content: { icon: Sparkles, color: "text-primary", bgColor: "bg-primary/10" },
  system: { icon: Zap, color: "text-orange-500", bgColor: "bg-orange-500/10" },
};

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return date.toLocaleDateString();
}

export default function Notifications() {
  const [notifications, setNotifications] = useState<Notification[]>(MOCK_NOTIFICATIONS);
  const [tab, setTab] = useState<"all" | "unread">("all");
  const [showSettings, setShowSettings] = useState(false);

  // Notification preferences
  const [prefs, setPrefs] = useState({
    trendAlerts: true,
    contentUpdates: true,
    systemNotices: true,
    emailNotifications: false,
    pushNotifications: true,
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  const displayed = tab === "unread" ? notifications.filter((n) => !n.read) : notifications;

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const deleteNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  return (
    <AppLayout>
      <div className="space-y-6 max-w-3xl">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Bell className="h-6 w-6 text-muted-foreground" />
              Notifications
              {unreadCount > 0 && (
                <Badge variant="default" className="ml-1">{unreadCount}</Badge>
              )}
            </h1>
            <p className="text-muted-foreground mt-1">
              Stay updated on your content and trends
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSettings(!showSettings)}
            >
              <Settings className="h-4 w-4 mr-1" />
              Preferences
            </Button>
            {unreadCount > 0 && (
              <Button variant="outline" size="sm" onClick={markAllAsRead}>
                <Check className="h-4 w-4 mr-1" />
                Mark all read
              </Button>
            )}
          </div>
        </div>

        {/* Notification Preferences */}
        {showSettings && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Notification Preferences</CardTitle>
              <CardDescription>Choose what notifications you want to receive</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Trend Alerts</Label>
                  <p className="text-xs text-muted-foreground">Get notified when trends match your niche</p>
                </div>
                <Switch
                  checked={prefs.trendAlerts}
                  onCheckedChange={(v) => setPrefs({ ...prefs, trendAlerts: v })}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <Label>Content Updates</Label>
                  <p className="text-xs text-muted-foreground">Status changes for your posts, reels, and videos</p>
                </div>
                <Switch
                  checked={prefs.contentUpdates}
                  onCheckedChange={(v) => setPrefs({ ...prefs, contentUpdates: v })}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <Label>System Notices</Label>
                  <p className="text-xs text-muted-foreground">Platform updates and feature announcements</p>
                </div>
                <Switch
                  checked={prefs.systemNotices}
                  onCheckedChange={(v) => setPrefs({ ...prefs, systemNotices: v })}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <Label>Email Notifications</Label>
                  <p className="text-xs text-muted-foreground">Receive important updates via email</p>
                </div>
                <Switch
                  checked={prefs.emailNotifications}
                  onCheckedChange={(v) => setPrefs({ ...prefs, emailNotifications: v })}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <Label>Push Notifications</Label>
                  <p className="text-xs text-muted-foreground">Browser push notifications for real-time updates</p>
                </div>
                <Switch
                  checked={prefs.pushNotifications}
                  onCheckedChange={(v) => setPrefs({ ...prefs, pushNotifications: v })}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tabs */}
        <Tabs value={tab} onValueChange={(v) => setTab(v as "all" | "unread")}>
          <TabsList>
            <TabsTrigger value="all">All ({notifications.length})</TabsTrigger>
            <TabsTrigger value="unread">
              Unread ({unreadCount})
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Notification List */}
        <div className="space-y-2">
          {displayed.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <BellOff className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground font-medium">
                  {tab === "unread" ? "No unread notifications" : "No notifications yet"}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  We'll notify you when something important happens
                </p>
              </CardContent>
            </Card>
          ) : (
            displayed.map((notification) => {
              const config = typeConfig[notification.type];
              const Icon = config.icon;
              return (
                <Card
                  key={notification.id}
                  className={cn(
                    "transition-all hover:border-primary/30",
                    !notification.read && "border-l-4 border-l-primary bg-primary/[0.02]"
                  )}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg shrink-0", config.bgColor)}>
                        <Icon className={cn("h-4.5 w-4.5", config.color)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className={cn("text-sm font-medium", !notification.read && "font-semibold")}>
                              {notification.title}
                            </p>
                            <p className="text-sm text-muted-foreground mt-0.5">
                              {notification.message}
                            </p>
                          </div>
                          <span className="text-xs text-muted-foreground shrink-0 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {timeAgo(notification.createdAt)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          {notification.actionUrl && notification.actionLabel && (
                            <Button variant="outline" size="sm" className="h-7 text-xs" asChild>
                              <a href={notification.actionUrl}>{notification.actionLabel}</a>
                            </Button>
                          )}
                          {!notification.read && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => markAsRead(notification.id)}
                            >
                              <Check className="h-3 w-3 mr-1" />
                              Mark read
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs text-muted-foreground hover:text-destructive"
                            onClick={() => deleteNotification(notification.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        {/* Clear All */}
        {notifications.length > 0 && (
          <div className="flex justify-center">
            <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={clearAll}>
              <Trash2 className="h-4 w-4 mr-1" />
              Clear all notifications
            </Button>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
