import Bull from "bull";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

// Lazy-init queues (created on first access)
let _mediaQueue: Bull.Queue | null = null;
let _transcriptionQueue: Bull.Queue | null = null;
let _pipelineQueue: Bull.Queue | null = null;

function createQueue(name: string, opts: Bull.QueueOptions = {}): Bull.Queue {
  return new Bull(name, REDIS_URL, {
    defaultJobOptions: {
      removeOnComplete: 50,
      removeOnFail: 100,
      attempts: 2,
      backoff: { type: "exponential", delay: 5000 },
    },
    ...opts,
  });
}

export function getMediaQueue(): Bull.Queue {
  if (!_mediaQueue) _mediaQueue = createQueue("mediaProcessing");
  return _mediaQueue;
}

export function getTranscriptionQueue(): Bull.Queue {
  if (!_transcriptionQueue) _transcriptionQueue = createQueue("transcription");
  return _transcriptionQueue;
}

export function getPipelineQueue(): Bull.Queue {
  if (!_pipelineQueue) _pipelineQueue = createQueue("agentPipeline");
  return _pipelineQueue;
}

export interface MediaJobData {
  mediaId: string;
  userId: string;
  s3Key: string;
  mimeType: string;
  jobDocId: string;
}

export interface TranscriptionJobData {
  mediaId: string;
  userId: string;
  audioS3Key: string;
  jobDocId: string;
}

export interface PipelineJobData {
  mediaId?: string;
  userId: string;
  text?: string;
  jobDocId: string;
  location?: string; // location string e.g. "Mumbai, India"
  creatorNiches?: string[];
  creatorPlatforms?: string[];
  creatorLanguages?: string[];
}

export async function addMediaJob(data: MediaJobData): Promise<Bull.Job> {
  return getMediaQueue().add(data, { timeout: 5 * 60 * 1000 });
}

export async function addTranscriptionJob(data: TranscriptionJobData): Promise<Bull.Job> {
  return getTranscriptionQueue().add(data, { timeout: 3 * 60 * 1000 });
}

export async function addPipelineJob(data: PipelineJobData): Promise<Bull.Job> {
  return getPipelineQueue().add(data, { timeout: 10 * 60 * 1000 });
}

export async function closeAllQueues(): Promise<void> {
  const promises: Promise<void>[] = [];
  if (_mediaQueue) promises.push(_mediaQueue.close());
  if (_transcriptionQueue) promises.push(_transcriptionQueue.close());
  if (_pipelineQueue) promises.push(_pipelineQueue.close());
  await Promise.all(promises);
}
