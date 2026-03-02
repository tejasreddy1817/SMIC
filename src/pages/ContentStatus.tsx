import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import {
  Activity,
  Clock,
  CheckCircle2,
  XCircle,
  Eye,
  Heart,
  MessageCircle,
  Share2,
  Play,
  Image,
  Film,
  FileText,
  Filter,
  Search,
  RefreshCw,
  BarChart3,
  TrendingUp,
  ArrowUpRight,
  Loader2,
} from "lucide-react";

type ContentType = "all" | "reel" | "post" | "video" | "story";
type ContentStatusType = "all" | "draft" | "scheduled" | "published" | "failed" | "processing";

interface ContentItem {
  id: string;
  title: string;
  type: "reel" | "post" | "video" | "story";
  platform: string;
  status: "draft" | "scheduled" | "published" | "failed" | "processing";
  createdAt: string;
  publishedAt?: string;
  scheduledAt?: string;
  metrics?: {
    views: number;
    likes: number;
    comments: number;
    shares: number;
  };
  thumbnail?: string;
}

const MOCK_CONTENT: ContentItem[] = [
  {
    id: "1",
    title: "5 AI Tools Every Creator Needs in 2026",
    type: "reel",
    platform: "instagram",
    status: "published",
    createdAt: "2026-02-20T10:30:00Z",
    publishedAt: "2026-02-21T14:00:00Z",
    metrics: { views: 12400, likes: 890, comments: 45, shares: 120 },
  },
  {
    id: "2",
    title: "Morning Routine for Productivity",
    type: "video",
    platform: "youtube_shorts",
    status: "scheduled",
    createdAt: "2026-02-22T08:00:00Z",
    scheduledAt: "2026-02-25T09:00:00Z",
  },
  {
    id: "3",
    title: "Behind the Scenes - Content Setup",
    type: "post",
    platform: "instagram",
    status: "draft",
    createdAt: "2026-02-23T11:00:00Z",
  },
  {
    id: "4",
    title: "Quick Tech Tips #42",
    type: "reel",
    platform: "instagram",
    status: "processing",
    createdAt: "2026-02-23T12:00:00Z",
  },
  {
    id: "5",
    title: "Failed Upload - Network Error",
    type: "story",
    platform: "instagram",
    status: "failed",
    createdAt: "2026-02-19T16:00:00Z",
  },
  {
    id: "6",
    title: "Top 10 Coding Shortcuts",
    type: "video",
    platform: "youtube_shorts",
    status: "published",
    createdAt: "2026-02-15T09:00:00Z",
    publishedAt: "2026-02-16T12:00:00Z",
    metrics: { views: 34200, likes: 2100, comments: 198, shares: 450 },
  },
];

const statusConfig: Record<string, { color: string; icon: any; label: string }> = {
  draft: { color: "bg-gray-500/10 text-gray-500 border-gray-500/20", icon: FileText, label: "Draft" },
  scheduled: { color: "bg-blue-500/10 text-blue-500 border-blue-500/20", icon: Clock, label: "Scheduled" },
  published: { color: "bg-green-500/10 text-green-500 border-green-500/20", icon: CheckCircle2, label: "Published" },
  failed: { color: "bg-red-500/10 text-red-500 border-red-500/20", icon: XCircle, label: "Failed" },
  processing: { color: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20", icon: RefreshCw, label: "Processing" },
};

const typeIcon: Record<string, any> = {
  reel: Film,
  post: Image,
  video: Play,
  story: Activity,
};

function formatNumber(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 1000) return (n / 1000).toFixed(1) + "K";
  return String(n);
}

export default function ContentStatus() {
  const { toast } = useToast();
  const [content, setContent] = useState<ContentItem[]>(MOCK_CONTENT);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<ContentType>("all");
  const [filterStatus, setFilterStatus] = useState<ContentStatusType>("all");

  const filtered = content.filter((item) => {
    if (filterType !== "all" && item.type !== filterType) return false;
    if (filterStatus !== "all" && item.status !== filterStatus) return false;
    if (search && !item.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const statusCounts = {
    all: content.length,
    draft: content.filter((c) => c.status === "draft").length,
    scheduled: content.filter((c) => c.status === "scheduled").length,
    published: content.filter((c) => c.status === "published").length,
    processing: content.filter((c) => c.status === "processing").length,
    failed: content.filter((c) => c.status === "failed").length,
  };

  const totalViews = content.reduce((sum, c) => sum + (c.metrics?.views || 0), 0);
  const totalLikes = content.reduce((sum, c) => sum + (c.metrics?.likes || 0), 0);
  const totalComments = content.reduce((sum, c) => sum + (c.metrics?.comments || 0), 0);

  const handleRetry = (id: string) => {
    setContent((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: "processing" as const } : c))
    );
    toast({ title: "Retrying upload", description: "Content is being reprocessed." });
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="h-6 w-6 text-muted-foreground" />
            Content Status
          </h1>
          <p className="text-muted-foreground mt-1">
            Track the status of your posts, reels, videos, and stories
          </p>
        </div>

        {/* Overview Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Content</CardTitle>
              <FileText className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{content.length}</div>
              <p className="text-xs text-muted-foreground">{statusCounts.published} published</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Views</CardTitle>
              <Eye className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatNumber(totalViews)}</div>
              <p className="text-xs text-green-500 flex items-center gap-1">
                <ArrowUpRight className="h-3 w-3" /> Across all content
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Likes</CardTitle>
              <Heart className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatNumber(totalLikes)}</div>
              <p className="text-xs text-muted-foreground">Engagement metric</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Comments</CardTitle>
              <MessageCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatNumber(totalComments)}</div>
              <p className="text-xs text-muted-foreground">Community interaction</p>
            </CardContent>
          </Card>
        </div>

        {/* Status Tabs */}
        <Tabs value={filterStatus} onValueChange={(v) => setFilterStatus(v as ContentStatusType)}>
          <TabsList>
            <TabsTrigger value="all">All ({statusCounts.all})</TabsTrigger>
            <TabsTrigger value="published">Published ({statusCounts.published})</TabsTrigger>
            <TabsTrigger value="scheduled">Scheduled ({statusCounts.scheduled})</TabsTrigger>
            <TabsTrigger value="draft">Drafts ({statusCounts.draft})</TabsTrigger>
            <TabsTrigger value="processing">Processing ({statusCounts.processing})</TabsTrigger>
            <TabsTrigger value="failed">Failed ({statusCounts.failed})</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Filters */}
        <div className="flex gap-4 items-center">
          <div className="relative max-w-sm flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search content..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={filterType} onValueChange={(v) => setFilterType(v as ContentType)}>
            <SelectTrigger className="w-40">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Content type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="reel">Reels</SelectItem>
              <SelectItem value="post">Posts</SelectItem>
              <SelectItem value="video">Videos</SelectItem>
              <SelectItem value="story">Stories</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Content List */}
        <div className="space-y-3">
          {filtered.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No content found matching your filters</p>
              </CardContent>
            </Card>
          ) : (
            filtered.map((item) => {
              const StatusIcon = statusConfig[item.status].icon;
              const TypeIcon = typeIcon[item.type];
              return (
                <Card key={item.id} className="hover:border-primary/30 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted shrink-0">
                          <TypeIcon className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium truncate">{item.title}</p>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <Badge variant="outline" className={statusConfig[item.status].color}>
                              <StatusIcon className="h-3 w-3 mr-1" />
                              {statusConfig[item.status].label}
                            </Badge>
                            <Badge variant="outline" className="capitalize">
                              {item.type}
                            </Badge>
                            <Badge variant="outline" className="capitalize">
                              {item.platform.replace("_", " ")}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {item.status === "scheduled" && item.scheduledAt
                                ? `Scheduled: ${new Date(item.scheduledAt).toLocaleDateString()} at ${new Date(item.scheduledAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                                : item.status === "published" && item.publishedAt
                                ? `Published: ${new Date(item.publishedAt).toLocaleDateString()}`
                                : `Created: ${new Date(item.createdAt).toLocaleDateString()}`}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 shrink-0 ml-4">
                        {/* Metrics for published content */}
                        {item.metrics && (
                          <div className="hidden md:flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Eye className="h-3.5 w-3.5" />
                              {formatNumber(item.metrics.views)}
                            </span>
                            <span className="flex items-center gap-1">
                              <Heart className="h-3.5 w-3.5" />
                              {formatNumber(item.metrics.likes)}
                            </span>
                            <span className="flex items-center gap-1">
                              <MessageCircle className="h-3.5 w-3.5" />
                              {formatNumber(item.metrics.comments)}
                            </span>
                            <span className="flex items-center gap-1">
                              <Share2 className="h-3.5 w-3.5" />
                              {formatNumber(item.metrics.shares)}
                            </span>
                          </div>
                        )}

                        {/* Actions */}
                        {item.status === "failed" && (
                          <Button size="sm" variant="outline" onClick={() => handleRetry(item.id)}>
                            <RefreshCw className="h-4 w-4 mr-1" />
                            Retry
                          </Button>
                        )}
                        {item.status === "processing" && (
                          <Loader2 className="h-4 w-4 animate-spin text-yellow-500" />
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </AppLayout>
  );
}
