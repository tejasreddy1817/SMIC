import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import {
  Newspaper,
  Loader2,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Shield,
  FileText,
  Wand2,
  Search,
  Clock,
  BarChart3,
  Zap,
  User,
} from "lucide-react";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { LocationPicker } from "@/components/LocationPicker";
import { LocationContext } from "@/hooks/useLocation";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";

// Types matching backend
interface ValidatedNewsItem {
  id: string;
  title: string;
  summary: string;
  source: string;
  category: string;
  publishedAt: string;
  relevanceScore: number;
  keywords: string[];
  sentiment: string;
  targetAudience: string;
  factualConfidence: number;
  timeliness: number;
  contentSuitability: number;
  validationScore: number;
}

interface RefinedNewsScript {
  id: string;
  newsItemId: string;
  title: string;
  hook: string;
  context: string;
  body: string;
  cta: string;
  fullScript: string;
  wordCount: number;
  estimatedDuration: number;
  platform: string;
  tone: string;
  language: string;
  refinementNotes: string[];
  readabilityScore: number;
  hookStrength: number;
  engagementPotential: number;
  originalWordCount: number;
  trimmed: boolean;
}

interface NewsScriptResult {
  newsItems: ValidatedNewsItem[];
  scripts: RefinedNewsScript[];
  meta: { executionTimeMs: number; agentsExecuted: string[] };
}

const PIPELINE_STEPS = [
  { key: "retrieval", label: "Retrieval", icon: Search, description: "Fetching news from multiple sources" },
  { key: "enrichment", label: "Enrichment", icon: Sparkles, description: "Adding semantic context & keywords" },
  { key: "validation", label: "Validation", icon: Shield, description: "Scoring factual confidence & timeliness" },
  { key: "scriptGen", label: "Script Gen", icon: FileText, description: "Generating 200-500 word scripts" },
  { key: "refinement", label: "Refinement", icon: Wand2, description: "Polishing hooks, trimming, scoring" },
];

function scoreColor(score: number): string {
  if (score >= 75) return "text-green-500";
  if (score >= 50) return "text-yellow-500";
  return "text-red-500";
}

function scoreBg(score: number): string {
  if (score >= 75) return "bg-green-500/10 text-green-500 border-green-500/20";
  if (score >= 50) return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
  return "bg-red-500/10 text-red-500 border-red-500/20";
}

export default function NewsScript() {
  const { toast } = useToast();
  const [selectedLocation, setSelectedLocation] = useState("");
  const [geoSelection, setGeoSelection] = useState<{ country: string; state?: string; city?: string }>({ country: "" });
  const [smartSearch, setSmartSearch] = useState("");
  const [generating, setGenerating] = useState(false);
  const [currentStep, setCurrentStep] = useState(-1);
  const [result, setResult] = useState<NewsScriptResult | null>(null);
  const [expandedScript, setExpandedScript] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleLocationChange = (loc: string, ctx: LocationContext | null) => {
    setSelectedLocation(loc);
  };

  const handleGeoChange = (geo: { country: string; state?: string; city?: string }) => {
    setGeoSelection(geo);
  };

  const handleGenerate = async () => {
    if (!geoSelection.country) {
      toast({ title: "Select a country", description: "Please select at least a country to generate scripts.", variant: "destructive" });
      return;
    }

    setGenerating(true);
    setResult(null);
    setCurrentStep(0);

    // Simulate step progression (backend runs sequentially, we animate steps)
    const stepInterval = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev >= 4) {
          clearInterval(stepInterval);
          return prev;
        }
        return prev + 1;
      });
    }, 3000);

    try {
      const resp = await api.post("/api/pipeline/news-script", {
        country: geoSelection.country,
        state: geoSelection.state,
        city: geoSelection.city,
        searchQuery: smartSearch.trim() || undefined,
      });

      clearInterval(stepInterval);

      if (!resp.ok) {
        const err = await resp.json();
        throw new Error(err.details || err.error || "Pipeline failed");
      }

      const data: NewsScriptResult = await resp.json();
      setResult(data);
      setCurrentStep(5); // All done
      toast({
        title: "Scripts Generated",
        description: `${data.scripts.length} scripts from ${data.newsItems.length} news items in ${(data.meta.executionTimeMs / 1000).toFixed(1)}s`,
      });
    } catch (err: any) {
      toast({ title: "Generation Failed", description: err.message, variant: "destructive" });
      setCurrentStep(-1);
    } finally {
      setGenerating(false);
    }
  };

  const copyScript = (script: RefinedNewsScript) => {
    navigator.clipboard.writeText(script.fullScript);
    setCopiedId(script.id);
    setTimeout(() => setCopiedId(null), 2000);
    toast({ title: "Copied!", description: "Script copied to clipboard" });
  };

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar />
      <main className="flex-1 ml-64 p-6 space-y-6 max-w-7xl">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Newspaper className="h-8 w-8 text-primary" />
            News Script Generator
          </h1>
          <p className="text-muted-foreground mt-1">
            Generate 200-500 word scripts from real-time news using a 5-agent AI pipeline
          </p>
        </div>

        {/* Location Picker (Cascading) */}
        <LocationPicker
          mode="cascading"
          onLocationChange={handleLocationChange}
          onGeoChange={handleGeoChange}
        />

        {/* Smart Search */}
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search person, press conference, event, latest news..."
                  value={smartSearch}
                  onChange={(e) => setSmartSearch(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
                  className="pl-9"
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Optional: Focus scripts on a specific person, event, or topic. Leave empty for general trending news.
            </p>
          </CardContent>
        </Card>

        {/* Generate Button */}
        <div className="flex items-center gap-4">
          <Button
            size="lg"
            onClick={handleGenerate}
            disabled={!geoSelection.country || generating}
            className="gap-2"
          >
            {generating ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Zap className="h-5 w-5" />
            )}
            {generating ? "Generating..." : "Generate News Scripts"}
          </Button>
          {result && (
            <span className="text-sm text-muted-foreground">
              Completed in {(result.meta.executionTimeMs / 1000).toFixed(1)}s
            </span>
          )}
        </div>

        {/* Pipeline Progress */}
        {(generating || currentStep >= 0) && currentStep < 5 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Pipeline Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {PIPELINE_STEPS.map((step, i) => {
                  const isActive = i === currentStep;
                  const isDone = i < currentStep;
                  const isPending = i > currentStep;

                  return (
                    <div key={step.key} className="flex items-center gap-3">
                      <div
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 transition-all ${
                          isDone
                            ? "border-green-500 bg-green-500/10"
                            : isActive
                            ? "border-primary bg-primary/10 animate-pulse"
                            : "border-muted-foreground/30 bg-muted/50"
                        }`}
                      >
                        {isDone ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : isActive ? (
                          <Loader2 className="h-4 w-4 text-primary animate-spin" />
                        ) : (
                          <step.icon className="h-4 w-4 text-muted-foreground/50" />
                        )}
                      </div>
                      <div className="flex-1">
                        <span
                          className={`text-sm font-medium ${
                            isDone ? "text-green-500" : isActive ? "text-foreground" : "text-muted-foreground"
                          }`}
                        >
                          {step.label}
                        </span>
                        {isActive && (
                          <p className="text-xs text-muted-foreground">{step.description}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
                <Progress value={(Math.min(currentStep + 1, 5) / 5) * 100} className="mt-2" />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Results */}
        {result && (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* News Items (Left — 2 cols) */}
            <div className="lg:col-span-2 space-y-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Search className="h-5 w-5 text-primary" />
                Validated News ({result.newsItems.length})
              </h2>
              <ScrollArea className="h-[600px] pr-2">
                <div className="space-y-3">
                  {result.newsItems.map((item) => (
                    <Card key={item.id} className="overflow-hidden">
                      <CardContent className="p-4 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="text-sm font-medium leading-tight">{item.title}</h3>
                          <Badge variant="outline" className={`shrink-0 text-xs ${scoreBg(item.validationScore)}`}>
                            {item.validationScore}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">{item.summary}</p>
                        <div className="flex flex-wrap gap-1.5">
                          <Badge variant="secondary" className="text-xs">{item.source}</Badge>
                          <Badge variant="secondary" className="text-xs">{item.category}</Badge>
                          {item.sentiment && (
                            <Badge variant="outline" className="text-xs">{item.sentiment}</Badge>
                          )}
                        </div>
                        {/* Score bars */}
                        <div className="grid grid-cols-3 gap-2 pt-1">
                          <div className="text-center">
                            <p className="text-[10px] text-muted-foreground">Factual</p>
                            <p className={`text-xs font-bold ${scoreColor(item.factualConfidence)}`}>{item.factualConfidence}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-[10px] text-muted-foreground">Timely</p>
                            <p className={`text-xs font-bold ${scoreColor(item.timeliness)}`}>{item.timeliness}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-[10px] text-muted-foreground">Suitable</p>
                            <p className={`text-xs font-bold ${scoreColor(item.contentSuitability)}`}>{item.contentSuitability}</p>
                          </div>
                        </div>
                        {item.keywords?.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {item.keywords.slice(0, 4).map((kw, i) => (
                              <Badge key={i} variant="outline" className="text-[10px] px-1.5 py-0">
                                {kw}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </div>

            {/* Generated Scripts (Right — 3 cols) */}
            <div className="lg:col-span-3 space-y-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Generated Scripts ({result.scripts.length})
              </h2>
              <div className="space-y-4">
                {result.scripts.map((script) => {
                  const isExpanded = expandedScript === script.id;

                  return (
                    <Card key={script.id} className="overflow-hidden">
                      <CardContent className="p-4 space-y-3">
                        {/* Header */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <h3 className="text-sm font-semibold">{script.title}</h3>
                            <div className="flex flex-wrap items-center gap-2 mt-1">
                              <Badge variant="secondary" className="text-xs">{script.platform}</Badge>
                              <Badge variant="outline" className="text-xs">{script.tone}</Badge>
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <FileText className="h-3 w-3" />
                                {script.wordCount} words
                              </span>
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                ~{script.estimatedDuration}s
                              </span>
                              {script.trimmed && (
                                <Badge variant="outline" className="text-xs text-yellow-500 border-yellow-500/30">
                                  Trimmed
                                </Badge>
                              )}
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            className="shrink-0 gap-1"
                            onClick={() => copyScript(script)}
                          >
                            {copiedId === script.id ? (
                              <Check className="h-3.5 w-3.5 text-green-500" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                            {copiedId === script.id ? "Copied" : "Copy"}
                          </Button>
                        </div>

                        {/* Scores */}
                        <div className="grid grid-cols-3 gap-3">
                          <div className="rounded-lg border p-2 text-center">
                            <p className="text-[10px] text-muted-foreground uppercase">Readability</p>
                            <p className={`text-lg font-bold ${scoreColor(script.readabilityScore)}`}>
                              {script.readabilityScore}
                            </p>
                          </div>
                          <div className="rounded-lg border p-2 text-center">
                            <p className="text-[10px] text-muted-foreground uppercase">Hook</p>
                            <p className={`text-lg font-bold ${scoreColor(script.hookStrength)}`}>
                              {script.hookStrength}
                            </p>
                          </div>
                          <div className="rounded-lg border p-2 text-center">
                            <p className="text-[10px] text-muted-foreground uppercase">Engagement</p>
                            <p className={`text-lg font-bold ${scoreColor(script.engagementPotential)}`}>
                              {script.engagementPotential}
                            </p>
                          </div>
                        </div>

                        {/* Hook preview */}
                        <div className="rounded-lg bg-primary/5 border border-primary/20 p-3">
                          <p className="text-[10px] font-semibold uppercase text-primary mb-1">Hook</p>
                          <p className="text-sm">{script.hook}</p>
                        </div>

                        {/* Expand/Collapse full script */}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full justify-center gap-1 text-xs"
                          onClick={() => setExpandedScript(isExpanded ? null : script.id)}
                        >
                          {isExpanded ? (
                            <>
                              <ChevronUp className="h-3.5 w-3.5" /> Hide Full Script
                            </>
                          ) : (
                            <>
                              <ChevronDown className="h-3.5 w-3.5" /> Show Full Script
                            </>
                          )}
                        </Button>

                        {isExpanded && (
                          <div className="space-y-3 border-t pt-3">
                            {/* Structured sections */}
                            {script.context && (
                              <div>
                                <p className="text-[10px] font-semibold uppercase text-muted-foreground mb-1">Context</p>
                                <p className="text-sm">{script.context}</p>
                              </div>
                            )}
                            {script.body && (
                              <div>
                                <p className="text-[10px] font-semibold uppercase text-muted-foreground mb-1">Body</p>
                                <p className="text-sm whitespace-pre-line">{script.body}</p>
                              </div>
                            )}
                            {script.cta && (
                              <div>
                                <p className="text-[10px] font-semibold uppercase text-muted-foreground mb-1">Call to Action</p>
                                <p className="text-sm font-medium text-primary">{script.cta}</p>
                              </div>
                            )}

                            <Separator />

                            {/* Full script text */}
                            <div>
                              <p className="text-[10px] font-semibold uppercase text-muted-foreground mb-1">Full Script</p>
                              <div className="rounded-lg bg-muted/50 p-3">
                                <p className="text-sm whitespace-pre-line">{script.fullScript}</p>
                              </div>
                            </div>

                            {/* Refinement Notes */}
                            {script.refinementNotes?.length > 0 && (
                              <div>
                                <p className="text-[10px] font-semibold uppercase text-muted-foreground mb-1">Refinement Notes</p>
                                <ul className="text-xs text-muted-foreground space-y-0.5">
                                  {script.refinementNotes.map((note, i) => (
                                    <li key={i} className="flex items-start gap-1">
                                      <Wand2 className="h-3 w-3 mt-0.5 shrink-0 text-primary/60" />
                                      {note}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!generating && !result && (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <Newspaper className="h-12 w-12 text-muted-foreground/40 mb-4" />
              <h3 className="text-lg font-semibold">No Scripts Generated Yet</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-md">
                Select a location using the cascading Country → State → City picker above, then click "Generate News Scripts" to run the 5-agent pipeline.
              </p>
              <div className="flex flex-wrap justify-center gap-2 mt-4">
                {PIPELINE_STEPS.map((step) => (
                  <Badge key={step.key} variant="outline" className="gap-1 text-xs">
                    <step.icon className="h-3 w-3" />
                    {step.label}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
