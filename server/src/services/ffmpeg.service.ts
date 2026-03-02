import ffmpeg from "fluent-ffmpeg";
import ffmpegStatic from "ffmpeg-static";
import fs from "fs";
import path from "path";
import os from "os";

// Set the ffmpeg binary path from ffmpeg-static
if (ffmpegStatic) {
  ffmpeg.setFfmpegPath(ffmpegStatic);
}

export interface MediaInfo {
  duration: number;    // seconds
  codec: string;
  size: number;        // bytes
  resolution?: string; // e.g. "1920x1080"
}

export function getTempDir(): string {
  const dir = path.join(os.tmpdir(), "SMIC-media");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function getTempPath(ext: string): string {
  return path.join(getTempDir(), `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`);
}

export function getMediaInfo(inputPath: string): Promise<MediaInfo> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(inputPath, (err, metadata) => {
      if (err) return reject(err);
      const format = metadata.format || {};
      const videoStream = (metadata.streams || []).find((s) => s.codec_type === "video");
      resolve({
        duration: format.duration || 0,
        codec: format.format_name || "unknown",
        size: format.size || 0,
        resolution: videoStream ? `${videoStream.width}x${videoStream.height}` : undefined,
      });
    });
  });
}

export function extractAudio(inputPath: string, outputPath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .noVideo()
      .audioCodec("libmp3lame")
      .audioBitrate("128k")
      .audioChannels(1)
      .audioFrequency(16000)
      .output(outputPath)
      .on("end", () => resolve(outputPath))
      .on("error", (err) => reject(err))
      .run();
  });
}

export function cleanupTempFile(filePath: string): void {
  try {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch {
    // ignore cleanup errors
  }
}
