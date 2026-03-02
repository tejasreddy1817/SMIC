import { useState, useEffect } from "react";
import { useLocation as useRouterLocation, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PipelineRunner } from "@/components/PipelineRunner";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import {
  Lightbulb, Sparkles, ArrowRight, ArrowLeft, TrendingUp,
  Loader2, FileText, X,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Idea {
  id: string;
  trend: string;
  platform: string;
  title: string;
  description: string;
  style: string;
  format?: string;
  creativityScore: number;
  executionEase: number;
  locationRelevance?: number;
  language?: string;
  culturalNotes?: string;
}

interface IncomingState {
  trends?: any[];
  location?: string;
  fromTrends?: boolean;
}

export default function Ideas() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const routerLocation = useRouterLocation();
  const incomingState = routerLocation.state as IncomingState | null;

  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [showRunner, setShowRunner] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [sourceTrends, setSourceTrends] = useState<any[]>([]);
  const [sourceLocation, setSourceLocation] = useState("");
  const [selectedIdea, setSelectedIdea] = useState<Idea | null>(null);

  // Auto-generate ideas when arriving from Trends page
  useEffect(() => {
    if (incomingState?.fromTrends && incomingState.trends?.length) {
      setSourceTrends(incomingState.trends);
      setSourceLocation(incomingState.location || "");
      generateIdeasFromTrends(incomingState.trends, incomingState.location || "");
      // Clear state to prevent re-triggering on re-render
      window.history.replaceState({}, document.title);
    }
  }, []);

  const generateIdeasFromTrends = async (trends: any[], location: string) => {
    setGenerating(true);
    try {
      const resp = await api.post("/api/pipeline/ideas", { trends, location });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Failed" }));
        throw new Error(err.details || err.error);
      }
      const data = await resp.json();
      if (data.ideas && Array.isArray(data.ideas)) {
        setIdeas(data.ideas);
        toast({ title: `Generated ${data.ideas.length} ideas!` });
      }
    } catch (err: any) {
      toast({ title: "Idea generation failed", description: err.message, variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const handleResult = (result: any) => {
    if (result?.ideas && Array.isArray(result.ideas)) {
      setIdeas(result.ideas);
      setShowRunner(false);
    }
  };

  const handleGenerateScripts = (idea: Idea) => {
    navigate("/scripts", {
      state: {
        ideas: [idea],
        location: sourceLocation,
        fromIdeas: true,
      },
    });
  };

  const handleGenerateAllScripts = () => {
    navigate("/scripts", {
      state: {
        ideas,
        location: sourceLocation,
        fromIdeas: true,
      },
    });
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return "text-green-600";
    if (score >= 40) return "text-yellow-600";
    return "text-red-500";
  };

  const styleColors: Record<string, string> = {
    educational: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    entertaining: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
    news_explainer: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300",
    storytelling: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
    opinion: "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300",
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Lightbulb className="h-6 w-6 text-secondary" />
              Idea Generator
            </h1>
            <p className="text-muted-foreground mt-1">
              {sourceTrends.length > 0
                ? `Ideas based on ${sourceTrends.length} trend${sourceTrends.length > 1 ? "s" : ""} from ${sourceLocation || "selected location"}`
                : "Location-aware, AI-powered content ideas from trends"}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate("/trends")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Trends
            </Button>
            {ideas.length > 0 && (
              <Button variant="outline" onClick={handleGenerateAllScripts}>
                <FileText className="mr-2 h-4 w-4" />
                Scripts from All
              </Button>
            )}
            <Button className="glow-primary-hover" onClick={() => setShowRunner(!showRunner)}>
              <Sparkles className="mr-2 h-4 w-4" />
              {showRunner ? "Hide Pipeline" : "Generate Ideas"}
            </Button>
          </div>
        </div>

        {/* Source trends indicator */}
        {sourceTrends.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-muted-foreground">From trends:</span>
            {sourceTrends.map((t, i) => (
              <Badge key={i} variant="secondary" className="text-xs">
                <TrendingUp className="mr-1 h-3 w-3" />
                {t.name}
              </Badge>
            ))}
          </div>
        )}

        {showRunner && <PipelineRunner onResult={handleResult} />}

        {generating ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-secondary" />
            <p className="text-sm text-muted-foreground">Generating content ideas from trends...</p>
          </div>
        ) : ideas.length === 0 && !showRunner ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary/10 mb-4">
                <Lightbulb className="h-8 w-8 text-secondary" />
              </div>
              <CardTitle className="mb-2">No ideas yet</CardTitle>
              <CardDescription className="max-w-md mb-6">
                Go to Trends to discover what's trending, then generate ideas from a specific trend.
              </CardDescription>
              <Button onClick={() => navigate("/trends")}>
                <TrendingUp className="mr-2 h-4 w-4" />
                Discover Trends First
              </Button>
            </CardContent>
          </Card>
        ) : ideas.length > 0 ? (
          <div className="flex gap-6">
            <div className={cn("grid gap-4 md:grid-cols-2 flex-1", selectedIdea ? "lg:grid-cols-2" : "lg:grid-cols-3")}>
              {ideas.map((idea, idx) => (
                <Card
                  key={idea.id || idx}
                  className={cn(
                    "group hover:border-secondary/50 hover:shadow-lg transition-all cursor-pointer",
                    selectedIdea?.id === idea.id && "border-secondary ring-2 ring-secondary/20"
                  )}
                  onClick={() => setSelectedIdea(idea)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <Badge variant="secondary" className="text-xs">{idea.platform}</Badge>
                      {idea.style && (
                        <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", styleColors[idea.style] || "bg-gray-100 text-gray-800")}>
                          {idea.style.replace("_", " ")}
                        </span>
                      )}
                      {idea.format && (
                        <Badge variant="outline" className="text-xs capitalize">{idea.format.replace("_", " ")}</Badge>
                      )}
                    </div>
                    <CardTitle className="text-base line-clamp-2">{idea.title}</CardTitle>
                    <CardDescription className="text-xs flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" />
                      Based on: {idea.trend}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-muted-foreground line-clamp-3">{idea.description}</p>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="text-center">
                        <div className={cn("font-bold text-lg", getScoreColor(idea.creativityScore))}>{idea.creativityScore}</div>
                        <div className="text-muted-foreground">Creativity</div>
                      </div>
                      <div className="text-center">
                        <div className={cn("font-bold text-lg", getScoreColor(idea.executionEase))}>{idea.executionEase}</div>
                        <div className="text-muted-foreground">Ease</div>
                      </div>
                      {idea.locationRelevance != null && (
                        <div className="text-center">
                          <div className={cn("font-bold text-lg", getScoreColor(idea.locationRelevance))}>{idea.locationRelevance}</div>
                          <div className="text-muted-foreground">Relevance</div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Idea detail panel */}
            {selectedIdea && (
              <div className="hidden lg:block w-96 shrink-0">
                <Card className="sticky top-6 border-secondary/30">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <Badge variant="secondary">{selectedIdea.platform}</Badge>
                          {selectedIdea.style && (
                            <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", styleColors[selectedIdea.style] || "bg-gray-100 text-gray-800")}>
                              {selectedIdea.style.replace("_", " ")}
                            </span>
                          )}
                        </div>
                        <CardTitle className="text-lg">{selectedIdea.title}</CardTitle>
                        <CardDescription className="text-xs mt-1 flex items-center gap-1">
                          <TrendingUp className="h-3 w-3" />Based on: {selectedIdea.trend}
                        </CardDescription>
                      </div>
                      <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => setSelectedIdea(null)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">{selectedIdea.description}</p>

                    <div className="grid grid-cols-3 gap-3">
                      <div className="p-2 rounded-lg bg-muted/50 text-center">
                        <div className={cn("text-xl font-bold", getScoreColor(selectedIdea.creativityScore))}>{selectedIdea.creativityScore}</div>
                        <div className="text-xs text-muted-foreground">Creativity</div>
                      </div>
                      <div className="p-2 rounded-lg bg-muted/50 text-center">
                        <div className={cn("text-xl font-bold", getScoreColor(selectedIdea.executionEase))}>{selectedIdea.executionEase}</div>
                        <div className="text-xs text-muted-foreground">Ease</div>
                      </div>
                      {selectedIdea.locationRelevance != null && (
                        <div className="p-2 rounded-lg bg-muted/50 text-center">
                          <div className={cn("text-xl font-bold", getScoreColor(selectedIdea.locationRelevance))}>{selectedIdea.locationRelevance}</div>
                          <div className="text-xs text-muted-foreground">Relevance</div>
                        </div>
                      )}
                    </div>

                    {selectedIdea.culturalNotes && (
                      <div>
                        <h4 className="text-sm font-medium mb-1">Cultural Notes</h4>
                        <p className="text-sm text-muted-foreground italic">{selectedIdea.culturalNotes}</p>
                      </div>
                    )}

                    {selectedIdea.language && (
                      <Badge variant="outline">{selectedIdea.language}</Badge>
                    )}

                    <div className="pt-2">
                      <Button
                        className="w-full glow-primary-hover"
                        onClick={() => handleGenerateScripts(selectedIdea)}
                      >
                        <FileText className="mr-2 h-4 w-4" />
                        Generate Scripts
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        ) : null}

        {/* Mobile idea detail */}
        {selectedIdea && (
          <div className="lg:hidden">
            <Card className="border-secondary/30">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg">{selectedIdea.title}</CardTitle>
                  <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => setSelectedIdea(null)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">{selectedIdea.description}</p>
                {selectedIdea.culturalNotes && (
                  <p className="text-sm text-muted-foreground italic">{selectedIdea.culturalNotes}</p>
                )}
                <Button
                  className="w-full glow-primary-hover"
                  onClick={() => handleGenerateScripts(selectedIdea)}
                >
                  <FileText className="mr-2 h-4 w-4" />
                  Generate Scripts
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
