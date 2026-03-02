import { Job as JobDoc } from "../models/Job";
import { Transcript } from "../models/Transcript";
import { Media } from "../models/Media";
import { runAutonomousPipeline, PipelineOptions } from "../agents/orchestrator";
import { PipelineJobData } from "../services/queue.service";
import Bull from "bull";

export default async function processPipelineJob(job: Bull.Job<PipelineJobData>): Promise<void> {
  const { mediaId, userId, text, jobDocId, location, creatorNiches, creatorPlatforms, creatorLanguages } = job.data;

  try {
    await JobDoc.findByIdAndUpdate(jobDocId, { status: "processing", progress: 5 });

    // 1. Resolve transcript text
    let transcriptText = text || "";
    let segments: { start: number; end: number; text: string }[] = [];
    let transcriptLanguage: string | undefined;
    let mediaDuration: number | undefined;
    let mediaType: "video" | "audio" | "text" = "text";

    if (mediaId && !transcriptText) {
      const transcript = await Transcript.findOne({ mediaId });
      if (transcript) {
        transcriptText = transcript.fullText;
        segments = transcript.segments || [];
        transcriptLanguage = transcript.language;
        mediaDuration = transcript.duration;
      }
      const media = await Media.findById(mediaId);
      if (media) {
        mediaType = media.mimeType.startsWith("audio/") ? "audio" : "video";
        mediaDuration = mediaDuration || media.duration;
      }
    }

    if (!transcriptText) {
      throw new Error("No transcript text available for pipeline processing");
    }

    await job.progress(10);
    await JobDoc.findByIdAndUpdate(jobDocId, { progress: 10 });

    // 2. Build pipeline options with full location + transcript context
    const openaiKey = process.env.OPENAI_API_KEY;
    if (!openaiKey) throw new Error("OPENAI_API_KEY is required");

    const wordCount = transcriptText.split(/\s+/).filter(Boolean).length;

    const pipelineOpts: PipelineOptions = {
      openaiKey,
      location: location || "US",
      niches: creatorNiches,
      platforms: creatorPlatforms,
      languages: creatorLanguages,
      transcript: {
        fullText: transcriptText,
        segments,
        language: transcriptLanguage,
        duration: mediaDuration,
        wordCount,
      },
      mediaType,
      mediaDuration,
    };

    await job.progress(15);
    await JobDoc.findByIdAndUpdate(jobDocId, { progress: 15 });

    // 3. Run the full chained pipeline: Location → Trends → Ideas → Scripts → Predict
    const result = await runAutonomousPipeline(pipelineOpts);

    await job.progress(90);
    await JobDoc.findByIdAndUpdate(jobDocId, { progress: 90 });

    // 4. Store results
    await JobDoc.findByIdAndUpdate(jobDocId, {
      status: "completed",
      progress: 100,
      completedAt: new Date(),
      result: {
        location: result.location,
        trends: result.trends,
        ideas: result.ideas,
        scripts: result.scripts,
        predictions: result.predictions,
        meta: {
          ...result.meta,
          mediaId,
        },
      },
    });

    await job.progress(100);
  } catch (err: any) {
    console.error(`[PipelineWorker] Error processing job ${jobDocId}:`, err.message);
    await JobDoc.findByIdAndUpdate(jobDocId, { status: "failed", error: err.message });
    throw err;
  }
}
