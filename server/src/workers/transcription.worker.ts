import fs from "fs";
import { Media } from "../models/Media";
import { Transcript } from "../models/Transcript";
import { Job as JobDoc } from "../models/Job";
import { downloadFromS3 } from "../services/s3.service";
import { getTempPath, cleanupTempFile } from "../services/ffmpeg.service";
import { transcribeAudio } from "../services/whisper.service";
import { addPipelineJob, TranscriptionJobData } from "../services/queue.service";
import Bull from "bull";

export default async function processTranscriptionJob(job: Bull.Job<TranscriptionJobData>): Promise<void> {
  const { mediaId, userId, audioS3Key, jobDocId } = job.data;
  let audioTmp = "";

  try {
    // Update status
    await Media.findByIdAndUpdate(mediaId, { status: "transcribing" });
    await JobDoc.findByIdAndUpdate(jobDocId, { status: "processing", progress: 10 });

    // 1. Download audio from S3
    const audioBuffer = await downloadFromS3(audioS3Key);
    audioTmp = getTempPath("mp3");
    fs.writeFileSync(audioTmp, audioBuffer);
    await job.progress(20);
    await JobDoc.findByIdAndUpdate(jobDocId, { progress: 20 });

    // 2. Send to Whisper API
    await job.progress(30);
    await JobDoc.findByIdAndUpdate(jobDocId, { progress: 30 });
    const result = await transcribeAudio(audioBuffer, `${mediaId}.mp3`);
    await job.progress(70);
    await JobDoc.findByIdAndUpdate(jobDocId, { progress: 70 });

    // 3. Create Transcript document
    const wordCount = result.text.split(/\s+/).filter(Boolean).length;
    const transcript = await Transcript.create({
      mediaId,
      userId,
      fullText: result.text,
      segments: result.segments,
      language: result.language,
      duration: result.duration,
      wordCount,
    });
    await job.progress(85);
    await JobDoc.findByIdAndUpdate(jobDocId, { progress: 85 });

    // 4. Update Media document
    await Media.findByIdAndUpdate(mediaId, {
      transcriptId: transcript._id,
      status: "completed",
      duration: result.duration || undefined,
    });

    // 5. Auto-queue pipeline job
    const pipelineJobDoc = await JobDoc.create({
      bullJobId: "pending",
      queue: "agentPipeline",
      userId,
      mediaId,
      status: "queued",
      progress: 0,
    });
    const pJob = await addPipelineJob({
      mediaId,
      userId,
      text: result.text,
      jobDocId: pipelineJobDoc._id.toString(),
    });
    await JobDoc.findByIdAndUpdate(pipelineJobDoc._id, { bullJobId: String(pJob.id) });

    await job.progress(100);
    await JobDoc.findByIdAndUpdate(jobDocId, { progress: 100, status: "completed", completedAt: new Date() });
  } catch (err: any) {
    console.error(`[TranscriptionWorker] Error processing ${mediaId}:`, err.message);
    await Media.findByIdAndUpdate(mediaId, { status: "failed", error: err.message });
    await JobDoc.findByIdAndUpdate(jobDocId, { status: "failed", error: err.message });
    throw err;
  } finally {
    cleanupTempFile(audioTmp);
  }
}
