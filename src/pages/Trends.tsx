import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { LocationPicker } from "@/components/LocationPicker";
import { LocationContext } from "@/hooks/useLocation";
import { api } from "@/lib/api";
import {
  TrendingUp, Loader2, Search, Sparkles, MapPin, Globe, Zap,
  X, Lightbulb, ArrowRight, BarChart3, Clock, Tag,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Trend {
  name: string;
  location: string;
  platforms: string[];
  strength: number;
  explanation: string;
  engagementVelocity?: number;
  crossPlatformPresence?: number;
  recency?: string;
  category?: string;
  sentiment?: string;
  keywords?: string[];
}

export default function Trends() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [trends, setTrends] = useState<Trend[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [smartSearch, setSmartSearch] = useState("");
  const [searching, setSearching] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState("");
  const [discovering, setDiscovering] = useState(false);
  const [selectedTrend, setSelectedTrend] = useState<Trend | null>(null);
  const [generatingIdeas, setGeneratingIdeas] = useState(false);
  const [searchMode, setSearchMode] = useState<"discover" | "search">("discover");

  const handleLocationChange = (loc: string, _ctx: LocationContext | null) => {
    setSelectedLocation(loc);
  };

  const handleSmartSearch = async () => {
    if (!smartSearch.trim()) {
      toast({ title: "Enter a search query", description: "Search for a person, topic, event, or location", variant: "destructive" });
      return;
    }
    setSearching(true);
    setSelectedTrend(null);
    setSearchMode("search");
    try {
      const resp = await api.post("/api/pipeline/search", {
        query: smartSearch.trim(),
        location: selectedLocation || undefined,
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Search failed" }));
        throw new Error(err.details || err.error);
      }
      const data = await resp.json();
      if (data.trends && Array.isArray(data.trends)) {
        setTrends(data.trends);
        toast({ title: `Found ${data.trends.length} results for "${smartSearch}"` });
      }
    } catch (err: any) {
      toast({ title: "Search failed", description: err.message, variant: "destructive" });
    } finally {
      setSearching(false);
    }
  };

  const handleDiscoverTrends = async () => {
    if (!selectedLocation) {
      toast({ title: "Select a location first", variant: "destructive" });
      return;
    }
    setDiscovering(true);
    setSelectedTrend(null);
    setSearchMode("discover");
    try {
      const resp = await api.post("/api/pipeline/trends", {
        location: selectedLocation,
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Discovery failed" }));
        throw new Error(err.details || err.error);
      }
      const data = await resp.json();
      if (data.trends && Array.isArray(data.trends)) {
        setTrends(data.trends);
        toast({ title: `Found ${data.trends.length} trends for ${selectedLocation}!` });
      }
    } catch (err: any) {
      toast({ title: "Trend discovery failed", description: err.message, variant: "destructive" });
    } finally {
      setDiscovering(false);
    }
  };

  const handleGenerateIdeas = async (trend: Trend) => {
    setGeneratingIdeas(true);
    // Navigate to Ideas page with the selected trend(s) and location
    navigate("/ideas", {
      state: {
        trends: [trend],
        location: selectedLocation,
        fromTrends: true,
      },
    });
  };

  const handleGenerateAllIdeas = () => {
    navigate("/ideas", {
      state: {
        trends,
        location: selectedLocation,
        fromTrends: true,
      },
    });
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return "text-green-600";
    if (score >= 40) return "text-yellow-600";
    return "text-red-500";
  };

  const getCategoryColor = (cat?: string) => {
    const m: Record<string, string> = {
      viral_video: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
      news: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
      hashtag: "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300",
      topic: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
      audio: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
    };
    return m[cat || "topic"] || "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
  };

  const getSentimentColor = (s?: string) => {
    if (s === "positive") return "text-green-600";
    if (s === "negative") return "text-red-500";
    if (s === "mixed") return "text-yellow-600";
    return "text-muted-foreground";
  };

  const filtered = trends.filter((t) =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <TrendingUp className="h-6 w-6 text-primary" />
              Trend Intelligence
            </h1>
            <p className="text-muted-foreground mt-1">
              Location-based trend discovery across all platforms
            </p>
          </div>
          <div className="flex gap-2">
            {trends.length > 0 && (
              <Button variant="outline" onClick={handleGenerateAllIdeas}>
                <Lightbulb className="mr-2 h-4 w-4" />
                Ideas from All
              </Button>
            )}
            <Button onClick={handleDiscoverTrends} disabled={!selectedLocation || discovering} className="glow-primary-hover">
              {discovering ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Discovering...</>
              ) : (
                <><Sparkles className="mr-2 h-4 w-4" />Discover Trends</>
              )}
            </Button>
          </div>
        </div>

        <LocationPicker onLocationChange={handleLocationChange} />

        {/* Smart Search Box */}
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search person, topic, event, press conference, area..."
                  value={smartSearch}
                  onChange={(e) => setSmartSearch(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSmartSearch()}
                  className="pl-9"
                />
              </div>
              <Button
                onClick={handleSmartSearch}
                disabled={!smartSearch.trim() || searching}
                variant="secondary"
                className="shrink-0"
              >
                {searching ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Searching...</>
                ) : (
                  <><Search className="mr-2 h-4 w-4" />Search Latest</>
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Search for a person's latest news, press conferences, interviews, or any topic by location and area
            </p>
          </CardContent>
        </Card>

        {trends.length > 0 && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Filter results..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
          </div>
        )}

        {(discovering || searching) ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">
              {searching
                ? `Searching latest news, press conferences & updates for "${smartSearch}"...`
                : "Analyzing trends across Instagram, YouTube, Google, Facebook, Way2News..."}
            </p>
          </div>
        ) : filtered.length === 0 && trends.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Globe className="h-12 w-12 text-muted-foreground mb-4" />
              <CardTitle className="mb-2">Select a location to discover trends</CardTitle>
              <CardDescription className="max-w-sm">
                Choose a country or city above, then click "Discover Trends"
              </CardDescription>
            </CardContent>
          </Card>
        ) : (
          <div className="flex gap-6">
            {/* Trend cards grid */}
            <div className={cn("grid gap-4 md:grid-cols-2 flex-1", selectedTrend ? "lg:grid-cols-2" : "lg:grid-cols-3")}>
              {filtered.map((trend, idx) => (
                <Card
                  key={idx}
                  className={cn(
                    "group transition-all cursor-pointer hover:border-primary/50 hover:shadow-lg",
                    selectedTrend?.name === trend.name && "border-primary ring-2 ring-primary/20"
                  )}
                  onClick={() => setSelectedTrend(trend)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          {trend.category && (
                            <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", getCategoryColor(trend.category))}>
                              {trend.category.replace("_", " ")}
                            </span>
                          )}
                          {trend.sentiment && trend.sentiment !== "neutral" && (
                            <Badge variant="outline" className={cn("text-xs capitalize", getSentimentColor(trend.sentiment))}>
                              {trend.sentiment}
                            </Badge>
                          )}
                        </div>
                        <CardTitle className="text-base line-clamp-2">{trend.name}</CardTitle>
                      </div>
                      <div className={cn("text-2xl font-bold", getScoreColor(trend.strength))}>{trend.strength}</div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-muted-foreground line-clamp-2">{trend.explanation}</p>
                    <div className="flex flex-wrap gap-1">
                      {trend.platforms.map((p) => (
                        <Badge key={p} variant="secondary" className="text-xs">{p}</Badge>
                      ))}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" />{trend.location}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Trend detail panel */}
            {selectedTrend && (
              <div className="hidden lg:block w-96 shrink-0">
                <Card className="sticky top-6 border-primary/30">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          {selectedTrend.category && (
                            <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", getCategoryColor(selectedTrend.category))}>
                              {selectedTrend.category.replace("_", " ")}
                            </span>
                          )}
                          {selectedTrend.sentiment && (
                            <Badge variant="outline" className={cn("text-xs capitalize", getSentimentColor(selectedTrend.sentiment))}>
                              {selectedTrend.sentiment}
                            </Badge>
                          )}
                        </div>
                        <CardTitle className="text-lg">{selectedTrend.name}</CardTitle>
                      </div>
                      <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => setSelectedTrend(null)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Score */}
                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <span className="text-sm font-medium">Trend Score</span>
                      <span className={cn("text-3xl font-bold", getScoreColor(selectedTrend.strength))}>{selectedTrend.strength}</span>
                    </div>

                    {/* Explanation */}
                    <div>
                      <h4 className="text-sm font-medium mb-1">About this trend</h4>
                      <p className="text-sm text-muted-foreground">{selectedTrend.explanation}</p>
                    </div>

                    {/* Metrics */}
                    <div className="grid grid-cols-2 gap-3">
                      {selectedTrend.engagementVelocity != null && (
                        <div className="p-2 rounded-lg bg-muted/50">
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                            <Zap className="h-3 w-3 text-yellow-500" />Velocity
                          </div>
                          <div className={cn("text-lg font-bold", getScoreColor(selectedTrend.engagementVelocity))}>
                            {selectedTrend.engagementVelocity}
                          </div>
                        </div>
                      )}
                      {selectedTrend.crossPlatformPresence != null && (
                        <div className="p-2 rounded-lg bg-muted/50">
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                            <Globe className="h-3 w-3 text-blue-500" />Platforms
                          </div>
                          <div className="text-lg font-bold">{selectedTrend.crossPlatformPresence}</div>
                        </div>
                      )}
                    </div>

                    {/* Platforms */}
                    <div>
                      <h4 className="text-sm font-medium mb-2">Trending on</h4>
                      <div className="flex flex-wrap gap-1">
                        {selectedTrend.platforms.map((p) => (
                          <Badge key={p} variant="secondary">{p}</Badge>
                        ))}
                      </div>
                    </div>

                    {/* Keywords */}
                    {selectedTrend.keywords && selectedTrend.keywords.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
                          <Tag className="h-3 w-3" />Keywords
                        </h4>
                        <div className="flex flex-wrap gap-1">
                          {selectedTrend.keywords.map((k) => (
                            <Badge key={k} variant="outline" className="text-xs">{k}</Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Location */}
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4" />{selectedTrend.location}
                    </div>

                    {/* Action buttons */}
                    <div className="pt-2 space-y-2">
                      <Button
                        className="w-full glow-primary-hover"
                        onClick={() => handleGenerateIdeas(selectedTrend)}
                        disabled={generatingIdeas}
                      >
                        <Lightbulb className="mr-2 h-4 w-4" />
                        Generate Ideas
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        )}

        {/* Mobile trend detail (shown below cards on small screens) */}
        {selectedTrend && (
          <div className="lg:hidden">
            <Card className="border-primary/30">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg">{selectedTrend.name}</CardTitle>
                  <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => setSelectedTrend(null)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <span className="text-sm font-medium">Trend Score</span>
                  <span className={cn("text-3xl font-bold", getScoreColor(selectedTrend.strength))}>{selectedTrend.strength}</span>
                </div>
                <p className="text-sm text-muted-foreground">{selectedTrend.explanation}</p>
                <div className="flex flex-wrap gap-1">
                  {selectedTrend.platforms.map((p) => (
                    <Badge key={p} variant="secondary">{p}</Badge>
                  ))}
                </div>
                {selectedTrend.keywords && selectedTrend.keywords.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {selectedTrend.keywords.map((k) => (
                      <Badge key={k} variant="outline" className="text-xs">{k}</Badge>
                    ))}
                  </div>
                )}
                <Button
                  className="w-full glow-primary-hover"
                  onClick={() => handleGenerateIdeas(selectedTrend)}
                  disabled={generatingIdeas}
                >
                  <Lightbulb className="mr-2 h-4 w-4" />
                  Generate Ideas
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
