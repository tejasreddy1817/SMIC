import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Upload, FileVideo, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface UploadDialogProps {
  onUploadComplete?: (mediaId: string, jobId: string) => void;
  children?: React.ReactNode;
}

const MAX_SIZE_MB = 50;

export function UploadDialog({ onUploadComplete, children }: UploadDialogProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadState, setUploadState] = useState<"idle" | "uploading" | "done" | "error">("idle");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    if (selected.size > MAX_SIZE_MB * 1024 * 1024) {
      toast({ title: "File too large", description: `Max file size is ${MAX_SIZE_MB}MB`, variant: "destructive" });
      return;
    }

    if (!selected.type.startsWith("video/") && !selected.type.startsWith("audio/")) {
      toast({ title: "Invalid file type", description: "Please upload a video or audio file", variant: "destructive" });
      return;
    }

    setFile(selected);
    setUploadState("idle");
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setUploadState("uploading");

    try {
      const formData = new FormData();
      formData.append("file", file);
      const resp = await api.upload("/api/media/upload", formData);

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Upload failed" }));
        throw new Error(err.error || "Upload failed");
      }

      const data = await resp.json();
      setUploadState("done");

      toast({ title: "Upload complete!", description: "Processing has started." });

      if (onUploadComplete) {
        onUploadComplete(data.media.id, data.jobId);
      }

      // Reset after delay
      setTimeout(() => {
        setOpen(false);
        setFile(null);
        setUploadState("idle");
      }, 1500);
    } catch (err: any) {
      setUploadState("error");
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline">
            <Upload className="mr-2 h-4 w-4" />
            Upload Video
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Upload Video or Audio</DialogTitle>
          <DialogDescription>
            Upload a file to extract text and run the AI pipeline
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Drop area */}
          <div
            className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*,audio/*"
              onChange={handleFileChange}
              className="hidden"
            />
            {file ? (
              <div className="space-y-2">
                <FileVideo className="h-10 w-10 mx-auto text-primary" />
                <p className="font-medium text-sm">{file.name}</p>
                <p className="text-xs text-muted-foreground">{formatSize(file.size)}</p>
              </div>
            ) : (
              <div className="space-y-2">
                <Upload className="h-10 w-10 mx-auto text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Click to select a video or audio file
                </p>
                <p className="text-xs text-muted-foreground">
                  Max {MAX_SIZE_MB}MB - MP4, MOV, WEBM, MP3, WAV
                </p>
              </div>
            )}
          </div>

          {/* Upload progress */}
          {uploadState === "uploading" && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Uploading and processing...</span>
              </div>
              <Progress value={50} className="h-2" />
            </div>
          )}

          {uploadState === "done" && (
            <div className="flex items-center gap-2 text-sm text-green-600">
              <CheckCircle className="h-4 w-4" />
              <span>Upload complete! Processing started.</span>
            </div>
          )}

          {uploadState === "error" && (
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              <span>Upload failed. Please try again.</span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleUpload}
            disabled={!file || uploading}
          >
            {uploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Upload & Process
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
