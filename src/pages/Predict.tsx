import { useState, useEffect } from "react";
import { useLocation as useRouterLocation, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { PipelineRunner } from "@/components/PipelineRunner";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import {
  BarChart3, Target, Sparkles, CheckCircle,
  Loader2, ArrowLeft, FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface PredictionFactors {
  trendMomentum: number;
  topicSaturation: number;
  ideaOriginality: number;
  scriptQuality: number;
  hookStrength: number;
  platformFit: number;
}

interface Prediction {
  scriptId: string;
  viralProbability: number;
  confidence: number;
  explanation: string;
  suggestions?: string[];
  factors?: PredictionFactors;
}

interface IncomingState {
  scripts?: any[];
  location?: string;
  fromScripts?: boolean;
}

export default function Predict() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const routerLocation = useRouterLocation();
  const incomingState = routerLocation.state as IncomingState | null;

  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [showRunner, setShowRunner] = useState(false);
  const [generating, setGenerating] = useState(false);

  // Auto-generate predictions when arriving from Scripts page
  useEffect(() => {
    if (incomingState?.fromScripts && incomingState.scripts?.length) {
      generatePredictions(incomingState.scripts, incomingState.location || "");
      window.history.replaceState({}, document.title);
    }
  }, []);

  const generatePredictions = async (scripts: any[], location: string) => {
    setGenerating(true);
    try {
      const resp = await api.post("/api/pipeline/predict", { scripts, location });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Failed" }));
        throw new Error(err.details || err.error);
      }
      const data = await resp.json();
      if (data.predictions && Array.isArray(data.predictions)) {
        setPredictions(data.predictions);
        toast({ title: `Generated ${data.predictions.length} predictions!` });
      }
    } catch (err: any) {
      toast({ title: "Prediction failed", description: err.message, variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const handleResult = (result: any) => {
    if (result?.predictions && Array.isArray(result.predictions)) {
      setPredictions(result.predictions);
      setShowRunner(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return "text-green-600";
    if (score >= 40) return "text-yellow-600";
    return "text-red-500";
  };

  const getProgressColor = (score: number) => {
    if (score >= 70) return "[&>div]:bg-green-500";
    if (score >= 40) return "[&>div]:bg-yellow-500";
    return "[&>div]:bg-red-500";
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <BarChart3 className="h-6 w-6 text-green-600" />
              Prediction Engine
            </h1>
            <p className="text-muted-foreground mt-1">
              Location-aware virality prediction with explainable factors
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate("/scripts")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Scripts
            </Button>
            <Button className="glow-primary-hover" onClick={() => setShowRunner(!showRunner)}>
              <Sparkles className="mr-2 h-4 w-4" />
              {showRunner ? "Hide Pipeline" : "Run Predictions"}
            </Button>
          </div>
        </div>

        {showRunner && <PipelineRunner onResult={handleResult} />}

        {generating ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-green-600" />
            <p className="text-sm text-muted-foreground">Predicting viral potential...</p>
          </div>
        ) : predictions.length === 0 && !showRunner ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10 mb-4">
                <Target className="h-8 w-8 text-green-600" />
              </div>
              <CardTitle className="mb-2">No predictions yet</CardTitle>
              <CardDescription className="max-w-md mb-6">
                Go to Trends, generate ideas, create scripts, then predict their viral potential.
              </CardDescription>
              <Button onClick={() => navigate("/trends")}>
                <Sparkles className="mr-2 h-4 w-4" />
                Start from Trends
              </Button>
            </CardContent>
          </Card>
        ) : predictions.length > 0 ? (
          <div className="space-y-4">
            {predictions.map((pred, idx) => (
              <Card key={pred.scriptId || idx} className="hover:border-green-500/50 transition-all">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn("text-3xl font-bold", getScoreColor(pred.viralProbability))}>
                        {pred.viralProbability}%
                      </div>
                      <div>
                        <CardTitle className="text-base">Viral Probability</CardTitle>
                        <CardDescription className="text-xs">
                          Confidence: {pred.confidence}%
                        </CardDescription>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      <FileText className="mr-1 h-3 w-3" />
                      Script: {(pred.scriptId || "").slice(0, 12)}...
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm">{pred.explanation}</p>

                  {pred.factors && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Factor Analysis</p>
                      <div className="grid gap-2">
                        {Object.entries(pred.factors).map(([key, value]) => (
                          <div key={key} className="flex items-center gap-3 text-sm">
                            <span className="w-32 text-muted-foreground capitalize">
                              {key.replace(/([A-Z])/g, " $1").trim()}
                            </span>
                            <Progress
                              value={value}
                              className={cn("flex-1 h-2", getProgressColor(value))}
                            />
                            <span className={cn("w-8 text-right font-medium", getScoreColor(value))}>
                              {value}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {pred.suggestions && pred.suggestions.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Improvement Suggestions</p>
                      <ul className="space-y-1">
                        {pred.suggestions.map((s, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                            <CheckCircle className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                            {s}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : null}
      </div>
    </AppLayout>
  );
}
