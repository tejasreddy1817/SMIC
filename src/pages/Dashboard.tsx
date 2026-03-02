import { useEffect, useState } from "react";
import { useCreator } from "@/hooks/useCreator";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Lightbulb, FileText, BarChart3, ArrowRight, Zap, Sparkles, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";

interface PipelineStats {
  totalRuns: number;
  completedRuns: number;
  totalTrends: number;
  totalIdeas: number;
  totalScripts: number;
  totalPredictions: number;
  latestRun?: {
    trendsCount: number;
    ideasCount: number;
    scriptsCount: number;
    predictionsCount: number;
    executionTimeMs: number;
  } | null;
}

const quickActions = [
  {
    title: "Discover Trends",
    description: "Find trending topics in your niche and region",
    icon: TrendingUp,
    href: "/trends",
    variant: "default" as const,
  },
  {
    title: "Generate Ideas",
    description: "Turn any topic into viral content ideas",
    icon: Lightbulb,
    href: "/ideas",
    variant: "outline" as const,
  },
  {
    title: "Write Scripts",
    description: "AI writes hooks and scripts in your voice",
    icon: FileText,
    href: "/scripts",
    variant: "outline" as const,
  },
];

export default function Dashboard() {
  const { creator } = useCreator();
  const { toast } = useToast();
  const [stats, setStats] = useState<PipelineStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const resp = await api.get("/api/pipeline/stats");
        if (resp.ok) {
          setStats(await resp.json());
        }
      } catch {
        // stats endpoint may not be available
      } finally {
        setStatsLoading(false);
      }
    })();
  }, []);

  const handleInstagramLogin = async () => {
    try {
      const redirect = `${window.location.origin}/auth/instagram/callback`;
      const resp = await api.get(`/api/auth/instagram/url?redirectUri=${encodeURIComponent(redirect)}&action=login`);
      if (!resp.ok) throw new Error(`Status ${resp.status}`);
      const data = await resp.json();
      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No url returned");
      }
    } catch (e: any) {
      toast({ title: "Instagram login failed", description: e.message || String(e), variant: "destructive" });
    }
  };

  const statCards = [
    {
      label: "Trending Topics",
      value: statsLoading ? "..." : String(stats?.totalTrends || 0),
      change: stats?.latestRun ? `${stats.latestRun.trendsCount} in latest run` : "Run pipeline to discover",
      icon: TrendingUp,
      href: "/trends",
      color: "text-primary",
    },
    {
      label: "Ideas Generated",
      value: statsLoading ? "..." : String(stats?.totalIdeas || 0),
      change: stats?.latestRun ? `${stats.latestRun.ideasCount} in latest run` : "Generate ideas from trends",
      icon: Lightbulb,
      href: "/ideas",
      color: "text-secondary",
    },
    {
      label: "Scripts Written",
      value: statsLoading ? "..." : String(stats?.totalScripts || 0),
      change: stats?.latestRun ? `${stats.latestRun.scriptsCount} in latest run` : "Turn ideas into scripts",
      icon: FileText,
      href: "/scripts",
      color: "text-accent",
    },
    {
      label: "Predictions Made",
      value: statsLoading ? "..." : String(stats?.totalPredictions || 0),
      change: stats?.latestRun ? `${stats.latestRun.predictionsCount} in latest run` : "Predict before posting",
      icon: BarChart3,
      href: "/predict",
      color: "text-success",
    },
  ];

  return (
    <AppLayout>
      <div className="space-y-8">
        {/* Welcome Header */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold">
              Welcome back, <span className="text-gradient-primary">{creator?.display_name || "Creator"}</span>
            </h1>
            <Sparkles className="h-6 w-6 text-primary animate-SMIC-slow" />
          </div>
          <p className="text-muted-foreground">
            Your AI content intelligence is ready. Let's create something viral.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {statCards.map((stat) => (
            <Link key={stat.label} to={stat.href}>
              <Card className="group transition-all hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {stat.label}
                  </CardTitle>
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {statsLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : stat.value}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {stat.change}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {/* Pipeline Runs Summary */}
        {stats && stats.totalRuns > 0 && (
          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="text-lg">Pipeline Activity</CardTitle>
              <CardDescription>
                {stats.completedRuns} completed out of {stats.totalRuns} total runs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 text-sm">
                <span className="text-muted-foreground">Latest run:</span>
                {stats.latestRun && (
                  <span>
                    {stats.latestRun.trendsCount} trends, {stats.latestRun.ideasCount} ideas, {stats.latestRun.scriptsCount} scripts in {(stats.latestRun.executionTimeMs / 1000).toFixed(1)}s
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Actions */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Quick Actions</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {quickActions.map((action) => (
              <Card
                key={action.title}
                className="group transition-all hover:border-primary/50"
              >
                <CardHeader>
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary mb-2 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    <action.icon className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-lg">{action.title}</CardTitle>
                  <CardDescription>{action.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Link to={action.href}>
                    <Button variant={action.variant} className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                      Get Started
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}

            {/* Instagram quick action */}
            <Card className="group transition-all hover:border-primary/50">
              <CardHeader>
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-pink-400 to-yellow-400 text-white mb-2">
                  <img src="/instagram-icon.svg" alt="IG" className="h-5 w-5" />
                </div>
                <CardTitle className="text-lg">Connect Instagram</CardTitle>
                <CardDescription>Sign in with Instagram to link your account</CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={handleInstagramLogin} className="w-full bg-gradient-to-r from-pink-500 to-yellow-400 text-white">
                  Sign in with Instagram
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Creator Profile Summary */}
        <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-secondary/5">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              <CardTitle>Your Creator Profile</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <span className="text-sm text-muted-foreground">Niches:</span>
              {creator?.niches?.length ? (
                creator.niches.map((niche) => (
                  <Badge key={niche} variant="secondary">{niche}</Badge>
                ))
              ) : (
                <Badge variant="outline">No niches selected</Badge>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="text-sm text-muted-foreground">Platforms:</span>
              {creator?.platform_focus?.map((platform) => (
                <Badge key={platform} variant="outline" className="capitalize">
                  {platform.replace("_", " ")}
                </Badge>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="text-sm text-muted-foreground">Languages:</span>
              {creator?.languages?.map((lang) => (
                <Badge key={lang} variant="outline" className="uppercase">
                  {lang}
                </Badge>
              ))}
            </div>
            <Link to="/settings">
              <Button variant="ghost" size="sm" className="mt-2">
                Edit Profile
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
