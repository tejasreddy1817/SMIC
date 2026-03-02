import { useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Can } from "@/components/auth/Can";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Users,
  Eye,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  Download,
  Calendar,
  FileText,
  Activity,
  Globe,
  Clock,
  Target,
  Layers,
} from "lucide-react";

interface PlatformMetric {
  platform: string;
  totalContent: number;
  totalViews: number;
  avgEngagement: number;
  topPerforming: string;
}

interface UserGrowthData {
  period: string;
  newUsers: number;
  activeUsers: number;
  churned: number;
}

interface ContentMetric {
  type: string;
  count: number;
  avgViews: number;
  avgEngagement: number;
  conversionRate: number;
}

const MOCK_PLATFORM_METRICS: PlatformMetric[] = [
  { platform: "Instagram Reels", totalContent: 1240, totalViews: 2450000, avgEngagement: 8.5, topPerforming: "5 AI Tools Reel" },
  { platform: "YouTube Shorts", totalContent: 680, totalViews: 1820000, avgEngagement: 6.2, topPerforming: "Top 10 Coding Shortcuts" },
  { platform: "TikTok", totalContent: 320, totalViews: 890000, avgEngagement: 9.1, topPerforming: "Day in My Life" },
];

const MOCK_USER_GROWTH: UserGrowthData[] = [
  { period: "Oct 2025", newUsers: 120, activeUsers: 890, churned: 15 },
  { period: "Nov 2025", newUsers: 185, activeUsers: 1050, churned: 22 },
  { period: "Dec 2025", newUsers: 210, activeUsers: 1230, churned: 18 },
  { period: "Jan 2026", newUsers: 290, activeUsers: 1490, churned: 25 },
  { period: "Feb 2026", newUsers: 340, activeUsers: 1780, churned: 20 },
];

const MOCK_CONTENT_METRICS: ContentMetric[] = [
  { type: "Reels", count: 4200, avgViews: 8500, avgEngagement: 7.8, conversionRate: 12.5 },
  { type: "Posts", count: 2800, avgViews: 3200, avgEngagement: 4.2, conversionRate: 8.1 },
  { type: "Videos", count: 1500, avgViews: 15000, avgEngagement: 5.6, conversionRate: 18.3 },
  { type: "Stories", count: 6100, avgViews: 1200, avgEngagement: 3.1, conversionRate: 5.4 },
];

const MOCK_TOP_NICHES = [
  { niche: "Tech", creators: 420, avgEngagement: 8.2 },
  { niche: "Gaming", creators: 380, avgEngagement: 9.5 },
  { niche: "Lifestyle", creators: 310, avgEngagement: 6.8 },
  { niche: "Fitness", creators: 280, avgEngagement: 7.4 },
  { niche: "Education", creators: 250, avgEngagement: 5.9 },
  { niche: "Comedy", creators: 220, avgEngagement: 11.2 },
  { niche: "Food", creators: 190, avgEngagement: 6.1 },
  { niche: "Fashion", creators: 170, avgEngagement: 7.9 },
];

function formatNumber(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 1000) return (n / 1000).toFixed(1) + "K";
  return String(n);
}

export default function ReportsAnalytics() {
  const [dateRange, setDateRange] = useState("30d");

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <BarChart3 className="h-8 w-8" />
              Reports & Analytics
            </h1>
            <p className="text-muted-foreground mt-1">Platform-wide performance and growth insights</p>
          </div>
          <div className="flex gap-2">
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-40">
                <Calendar className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
                <SelectItem value="1y">Last year</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline">
              <Download className="h-4 w-4 mr-1" />
              Export Report
            </Button>
          </div>
        </div>

        {/* Overview Stats */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Creators</CardTitle>
              <Users className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">1,780</div>
              <p className="text-xs text-green-500 flex items-center gap-1 mt-1">
                <ArrowUpRight className="h-3 w-3" /> +340 this month
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Content</CardTitle>
              <FileText className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">14.6K</div>
              <p className="text-xs text-green-500 flex items-center gap-1 mt-1">
                <ArrowUpRight className="h-3 w-3" /> +2.1K this month
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Views</CardTitle>
              <Eye className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">5.16M</div>
              <p className="text-xs text-green-500 flex items-center gap-1 mt-1">
                <ArrowUpRight className="h-3 w-3" /> +18.2% from last month
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Pipeline Runs</CardTitle>
              <Zap className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">8,420</div>
              <p className="text-xs text-green-500 flex items-center gap-1 mt-1">
                <ArrowUpRight className="h-3 w-3" /> +25% this month
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="platform">
          <TabsList>
            <TabsTrigger value="platform">Platform Performance</TabsTrigger>
            <TabsTrigger value="content">Content Analytics</TabsTrigger>
            <TabsTrigger value="growth">User Growth</TabsTrigger>
            <TabsTrigger value="niches">Niche Analysis</TabsTrigger>
          </TabsList>

          {/* Platform Performance */}
          <TabsContent value="platform" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              {MOCK_PLATFORM_METRICS.map((pm) => (
                <Card key={pm.platform}>
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Globe className="h-5 w-5 text-primary" />
                      <CardTitle className="text-base">{pm.platform}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Total Content</span>
                      <span className="font-medium">{formatNumber(pm.totalContent)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Total Views</span>
                      <span className="font-medium">{formatNumber(pm.totalViews)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Avg Engagement</span>
                      <span className="font-medium text-green-500">{pm.avgEngagement}%</span>
                    </div>
                    <div className="border-t pt-2">
                      <span className="text-xs text-muted-foreground">Top Performing:</span>
                      <p className="text-sm font-medium mt-0.5">{pm.topPerforming}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Content Analytics */}
          <TabsContent value="content" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Content Performance by Type</CardTitle>
                <CardDescription>Breakdown of content metrics across different formats</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {MOCK_CONTENT_METRICS.map((cm) => (
                    <div key={cm.type} className="flex items-center justify-between rounded-lg border p-4">
                      <div className="flex items-center gap-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                          <Layers className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{cm.type}</p>
                          <p className="text-sm text-muted-foreground">{formatNumber(cm.count)} total</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-8 text-sm">
                        <div className="text-center">
                          <p className="text-muted-foreground">Avg Views</p>
                          <p className="font-medium">{formatNumber(cm.avgViews)}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-muted-foreground">Engagement</p>
                          <p className="font-medium text-green-500">{cm.avgEngagement}%</p>
                        </div>
                        <div className="text-center">
                          <p className="text-muted-foreground">Conversion</p>
                          <p className="font-medium text-blue-500">{cm.conversionRate}%</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* User Growth */}
          <TabsContent value="growth" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>User Growth Trend</CardTitle>
                <CardDescription>Monthly new signups, active users, and churn</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {MOCK_USER_GROWTH.map((data) => (
                    <div key={data.period} className="flex items-center justify-between rounded-lg border p-4">
                      <div>
                        <p className="font-medium">{data.period}</p>
                      </div>
                      <div className="flex items-center gap-8 text-sm">
                        <div className="text-center">
                          <p className="text-muted-foreground">New Users</p>
                          <p className="font-medium text-green-500">+{data.newUsers}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-muted-foreground">Active</p>
                          <p className="font-medium">{formatNumber(data.activeUsers)}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-muted-foreground">Churned</p>
                          <p className="font-medium text-red-500">-{data.churned}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-muted-foreground">Net Growth</p>
                          <p className="font-medium text-green-500">+{data.newUsers - data.churned}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Niche Analysis */}
          <TabsContent value="niches" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Top Niches by Creators</CardTitle>
                <CardDescription>Most popular content niches on the platform</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {MOCK_TOP_NICHES.map((niche, index) => (
                    <div key={niche.niche} className="flex items-center justify-between rounded-lg border p-4">
                      <div className="flex items-center gap-4">
                        <span className="text-lg font-bold text-muted-foreground w-6">#{index + 1}</span>
                        <div>
                          <p className="font-medium">{niche.niche}</p>
                          <p className="text-sm text-muted-foreground">{niche.creators} creators</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Avg Engagement:</span>
                        <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
                          {niche.avgEngagement}%
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
