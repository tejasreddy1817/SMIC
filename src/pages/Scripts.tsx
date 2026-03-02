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
  FileText, Plus, Sparkles, Copy, Check, Loader2,
  ArrowLeft, ArrowRight, Lightbulb, BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Script {
  id: string;
  ideaId: string;
  platform: string;
  tone: string;
  lengthSeconds?: number;
  content: string;
  hook?: string;
  structure?: string;
  language?: string;
  rank?: number;
}

interface IncomingState {
  ideas?: any[];
  location?: string;
  fromIdeas?: boolean;
}

export default function Scripts() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const routerLocation = useRouterLocation();
  const incomingState = routerLocation.state as IncomingState | null;

  const [scripts, setScripts] = useState<Script[]>([]);
  const [showRunner, setShowRunner] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [sourceIdeas, setSourceIdeas] = useState<any[]>([]);
  const [sourceLocation, setSourceLocation] = useState("");

  // Auto-generate scripts when arriving from Ideas page
  useEffect(() => {
    if (incomingState?.fromIdeas && incomingState.ideas?.length) {
      setSourceIdeas(incomingState.ideas);
      setSourceLocation(incomingState.location || "");
      generateScriptsFromIdeas(incomingState.ideas, incomingState.location || "");
      window.history.replaceState({}, document.title);
    }
  }, []);

  const generateScriptsFromIdeas = async (ideas: any[], location: string) => {
    setGenerating(true);
    try {
      const resp = await api.post("/api/pipeline/scripts", { ideas, location });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Failed" }));
        throw new Error(err.details || err.error);
      }
      const data = await resp.json();
      if (data.scripts && Array.isArray(data.scripts)) {
        setScripts(data.scripts);
        toast({ title: `Generated ${data.scripts.length} scripts!` });
      }
    } catch (err: any) {
      toast({ title: "Script generation failed", description: err.message, variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const handleResult = (result: any) => {
    if (result?.scripts && Array.isArray(result.scripts)) {
      setScripts(result.scripts);
      setShowRunner(false);
    }
  };

  const handleCopy = async (script: Script) => {
    await navigator.clipboard.writeText(script.content);
    setCopiedId(script.id);
    toast({ title: "Script copied!" });
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handlePredict = () => {
    navigate("/predict", {
      state: {
        scripts,
        location: sourceLocation,
        fromScripts: true,
      },
    });
  };

  const toneColors: Record<string, string> = {
    conversational: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    authoritative: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300",
    humorous: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
    dramatic: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
    inspirational: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FileText className="h-6 w-6 text-accent" />
              Script Studio
            </h1>
            <p className="text-muted-foreground mt-1">
              {sourceIdeas.length > 0
                ? `Scripts based on ${sourceIdeas.length} idea${sourceIdeas.length > 1 ? "s" : ""}`
                : "AI-generated scripts with hook-value-payoff-CTA structure"}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate("/ideas")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Ideas
            </Button>
            {scripts.length > 0 && (
              <Button variant="outline" onClick={handlePredict}>
                <BarChart3 className="mr-2 h-4 w-4" />
                Predict Viral
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            )}
            <Button className="glow-primary-hover" onClick={() => setShowRunner(!showRunner)}>
              <Plus className="mr-2 h-4 w-4" />
              {showRunner ? "Hide Pipeline" : "New Script"}
            </Button>
          </div>
        </div>

        {/* Source ideas indicator */}
        {sourceIdeas.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-muted-foreground">From ideas:</span>
            {sourceIdeas.map((idea, i) => (
              <Badge key={i} variant="secondary" className="text-xs">
                <Lightbulb className="mr-1 h-3 w-3" />
                {idea.title}
              </Badge>
            ))}
          </div>
        )}

        {showRunner && <PipelineRunner onResult={handleResult} />}

        {generating ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-accent" />
            <p className="text-sm text-muted-foreground">Generating scripts from ideas...</p>
          </div>
        ) : scripts.length === 0 && !showRunner ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent/10 mb-4">
                <FileText className="h-8 w-8 text-accent" />
              </div>
              <CardTitle className="mb-2">No scripts yet</CardTitle>
              <CardDescription className="max-w-md mb-6">
                Go to Trends, generate ideas, then create scripts from a specific idea.
              </CardDescription>
              <Button onClick={() => navigate("/trends")}>
                <Sparkles className="mr-2 h-4 w-4" />
                Start from Trends
              </Button>
            </CardContent>
          </Card>
        ) : scripts.length > 0 ? (
          <div className="space-y-4">
            {scripts.map((script, idx) => (
              <Card key={script.id || idx} className="hover:border-accent/50 transition-all">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-wrap">
                      {script.rank && (
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                          {script.rank}
                        </span>
                      )}
                      <Badge variant="secondary" className="text-xs">{script.platform}</Badge>
                      <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", toneColors[script.tone] || "bg-gray-100 text-gray-800")}>
                        {script.tone}
                      </span>
                      {script.lengthSeconds && (
                        <Badge variant="outline" className="text-xs">{script.lengthSeconds}s</Badge>
                      )}
                      {script.language && (
                        <Badge variant="outline" className="text-xs">{script.language}</Badge>
                      )}
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => handleCopy(script)}>
                      {copiedId === script.id ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {script.hook && (
                    <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
                      <p className="text-xs font-medium text-primary mb-1">Hook (0-3s)</p>
                      <p className="text-sm font-medium">{script.hook}</p>
                    </div>
                  )}
                  <div className="whitespace-pre-wrap text-sm leading-relaxed">
                    {script.content}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : null}
      </div>
    </AppLayout>
  );
}
