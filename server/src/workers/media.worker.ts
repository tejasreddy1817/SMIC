import fs from "fs";
import { Media } from "../models/Media";
import { Job as JobDoc } from "../models/Job";
import { downloadFromS3, uploadToS3 } from "../services/s3.service";
import { extractAudio, getMediaInfo, getTempPath, cleanupTempFile } from "../services/ffmpeg.service";
import { addTranscriptionJob, MediaJobData } from "../services/queue.service";
import Bull from "bull";

export default async function processMediaJob(job: Bull.Job<MediaJobData>): Promise<void> {
  const { mediaId, userId, s3Key, mimeType, jobDocId } = job.data;
  let videoTmp = "";
  let audioTmp = "";

  try {
    // Update status
    await Media.findByIdAndUpdate(mediaId, { status: "processing" });
    await JobDoc.findByIdAndUpdate(jobDocId, { status: "processing", progress: 10 });

    // 1. Download from S3
    const buffer = await downloadFromS3(s3Key);
    const ext = mimeType.includes("audio") ? "mp3" : "mp4";
    videoTmp = getTempPath(ext);
    fs.writeFileSync(videoTmp, buffer);
    await job.progress(20);
    await JobDoc.findByIdAndUpdate(jobDocId, { progress: 20 });

    // 2. Get media info
    const info = await getMediaInfo(videoTmp);
    await Media.findByIdAndUpdate(mediaId, {
      duration: info.duration,
      resolution: info.resolution,
    });
    await job.progress(30);
    await JobDoc.findByIdAndUpdate(jobDocId, { progress: 30 });

    // 3. Extract audio
    let audioS3Key: string;
    if (mimeType.startsWith("audio/")) {
      // Already audio — use original
      audioS3Key = s3Key;
    } else {
      audioTmp = getTempPath("mp3");
      await extractAudio(videoTmp, audioTmp);
      const audioBuffer = fs.readFileSync(audioTmp);
      audioS3Key = `audio/${userId}/${mediaId}.mp3`;
      await uploadToS3(audioBuffer, audioS3Key, "audio/mpeg");
    }
    await job.progress(60);
    await JobDoc.findByIdAndUpdate(jobDocId, { progress: 60 });

    // 4. Update media
    await Media.findByIdAndUpdate(mediaId, {
      audioS3Key,
      status: "audio_extracted",
    });

    // 5. Queue transcription
    const transcriptionJobDoc = await JobDoc.create({
      bullJobId: "pending",
      queue: "transcription",
      userId,
      mediaId,
      status: "queued",
      progress: 0,
    });
    const tJob = await addTranscriptionJob({
      mediaId,
      userId,
      audioS3Key,
      jobDocId: transcriptionJobDoc._id.toString(),
    });
    await JobDoc.findByIdAndUpdate(transcriptionJobDoc._id, { bullJobId: String(tJob.id) });

    await job.progress(80);
    await JobDoc.findByIdAndUpdate(jobDocId, { progress: 80, status: "completed", completedAt: new Date() });
  } catch (err: any) {
    console.error(`[MediaWorker] Error processing ${mediaId}:`, err.message);
    await Media.findByIdAndUpdate(mediaId, { status: "failed", error: err.message });
    await JobDoc.findByIdAndUpdate(jobDocId, { status: "failed", error: err.message });
    throw err;
  } finally {
    cleanupTempFile(videoTmp);
    cleanupTempFile(audioTmp);
  }
}
