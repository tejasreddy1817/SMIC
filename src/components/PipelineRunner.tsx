import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { LocationPicker } from "@/components/LocationPicker";
import { UploadDialog } from "@/components/UploadDialog";
import { useJobStatus } from "@/hooks/useJobStatus";
import { LocationContext } from "@/hooks/useLocation";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2, Play, Upload, MapPin, FileText, TrendingUp,
  Lightbulb, BarChart3, CheckCircle, AlertCircle,
} from "lucide-react";

interface PipelineRunnerProps {
  onResult?: (result: any) => void;
}

export function PipelineRunner({ onResult }: PipelineRunnerProps) {
  const { toast } = useToast();
  const [location, setLocation] = useState("");
  const [locationCtx, setLocationCtx] = useState<LocationContext | null>(null);
  const [text, setText] = useState("");
  const [running, setRunning] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const { status, result } = useJobStatus(jobId);

  // When job completes, propagate result
  if (result && onResult) {
    onResult(result);
  }

  const handleLocationChange = (loc: string, ctx: LocationContext | null) => {
    setLocation(loc);
    setLocationCtx(ctx);
  };

  const handleRunSync = async () => {
    if (!location) {
      toast({ title: "Select a location first", variant: "destructive" });
      return;
    }
    if (!text.trim()) {
      toast({ title: "Enter text or upload a video", variant: "destructive" });
      return;
    }

    setRunning(true);
    try {
      const resp = await api.post("/api/pipeline/run", { location, text });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Pipeline failed" }));
        throw new Error(err.error);
      }
      const data = await resp.json();
      if (onResult) onResult(data);
      toast({ title: "Pipeline complete!" });
    } catch (err: any) {
      toast({ title: "Pipeline failed", description: err.message, variant: "destructive" });
    } finally {
      setRunning(false);
    }
  };

  const handleRunAsync = async () => {
    if (!location) {
      toast({ title: "Select a location first", variant: "destructive" });
      return;
    }
    if (!text.trim()) {
      toast({ title: "Enter text or upload a video", variant: "destructive" });
      return;
    }

    try {
      const resp = await api.post("/api/pipeline/run/async", { location, text });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Failed to start pipeline" }));
        throw new Error(err.error);
      }
      const data = await resp.json();
      setJobId(data.jobId);
      toast({ title: "Pipeline started!", description: "Tracking progress..." });
    } catch (err: any) {
      toast({ title: "Failed to start pipeline", description: err.message, variant: "destructive" });
    }
  };

  const handleUploadComplete = (mediaId: string, _jobId: string) => {
    // After upload + transcription, the pipeline will auto-queue
    toast({ title: "Video uploaded!", description: "Transcription started. Pipeline will run automatically." });
  };

  const pipelineSteps = [
    { icon: MapPin, label: "Location", done: !!locationCtx },
    { icon: TrendingUp, label: "Trends", done: !!result?.trends },
    { icon: Lightbulb, label: "Ideas", done: !!result?.ideas },
    { icon: FileText, label: "Scripts", done: !!result?.scripts },
    { icon: BarChart3, label: "Predict", done: !!result?.predictions },
  ];

  return (
    <div className="space-y-4">
      {/* Location Picker */}
      <LocationPicker onLocationChange={handleLocationChange} />

      {/* Input Options */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Input</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            placeholder="Paste transcript text, describe a topic, or upload a video..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="min-h-[100px]"
          />
          <div className="flex gap-2">
            <UploadDialog onUploadComplete={handleUploadComplete}>
              <Button variant="outline" size="sm">
                <Upload className="mr-2 h-4 w-4" />
                Upload Video
              </Button>
            </UploadDialog>
          </div>
        </CardContent>
      </Card>

      {/* Run Buttons */}
      <div className="flex gap-2">
        <Button
          onClick={handleRunSync}
          disabled={running || !location}
          className="flex-1"
        >
          {running ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Running Pipeline...</>
          ) : (
            <><Play className="mr-2 h-4 w-4" />Run Pipeline</>
          )}
        </Button>
        <Button
          variant="outline"
          onClick={handleRunAsync}
          disabled={!location || !text.trim()}
        >
          Queue Async
        </Button>
      </div>

      {/* Pipeline Progress */}
      {(running || status) && (
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between gap-2 mb-3">
              {pipelineSteps.map((step, i) => (
                <div key={step.label} className="flex items-center gap-1 text-xs">
                  {step.done ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <step.icon className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className={step.done ? "text-foreground font-medium" : "text-muted-foreground"}>
                    {step.label}
                  </span>
                  {i < pipelineSteps.length - 1 && (
                    <span className="text-muted-foreground mx-1">→</span>
                  )}
                </div>
              ))}
            </div>
            {status && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="capitalize">{status.status}</span>
                  <span>{status.progress}%</span>
                </div>
                <Progress value={status.progress} className="h-2" />
                {status.status === "failed" && status.error && (
                  <div className="flex items-center gap-2 text-sm text-destructive">
                    <AlertCircle className="h-4 w-4" />
                    <span>{status.error}</span>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
