import { getMediaQueue, getTranscriptionQueue, getPipelineQueue, closeAllQueues } from "../services/queue.service";
import processMediaJob from "./media.worker";
import processTranscriptionJob from "./transcription.worker";
import processPipelineJob from "./pipeline.worker";

const CONCURRENCY = {
  media: 2,
  transcription: 1,
  pipeline: 1,
};

export function initWorkers(): void {
  console.log("[Workers] Initializing job queue workers...");

  const mediaQueue = getMediaQueue();
  mediaQueue.process(CONCURRENCY.media, processMediaJob);
  mediaQueue.on("completed", (job) => {
    console.log(`[MediaWorker] Job ${job.id} completed for media ${job.data.mediaId}`);
  });
  mediaQueue.on("failed", (job, err) => {
    console.error(`[MediaWorker] Job ${job.id} failed:`, err.message);
  });

  const transcriptionQueue = getTranscriptionQueue();
  transcriptionQueue.process(CONCURRENCY.transcription, processTranscriptionJob);
  transcriptionQueue.on("completed", (job) => {
    console.log(`[TranscriptionWorker] Job ${job.id} completed for media ${job.data.mediaId}`);
  });
  transcriptionQueue.on("failed", (job, err) => {
    console.error(`[TranscriptionWorker] Job ${job.id} failed:`, err.message);
  });

  const pipelineQueue = getPipelineQueue();
  pipelineQueue.process(CONCURRENCY.pipeline, processPipelineJob);
  pipelineQueue.on("completed", (job) => {
    console.log(`[PipelineWorker] Job ${job.id} completed`);
  });
  pipelineQueue.on("failed", (job, err) => {
    console.error(`[PipelineWorker] Job ${job.id} failed:`, err.message);
  });

  console.log("[Workers] All workers initialized (media:2, transcription:1, pipeline:1)");
}

export async function shutdownWorkers(): Promise<void> {
  console.log("[Workers] Shutting down...");
  await closeAllQueues();
  console.log("[Workers] All queues closed");
}
