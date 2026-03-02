import axios from "axios";
import FormData from "form-data";

const WHISPER_URL = "https://api.openai.com/v1/audio/transcriptions";
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB Whisper API limit

export interface WhisperSegment {
  start: number;
  end: number;
  text: string;
}

export interface WhisperResult {
  text: string;
  language: string;
  duration: number;
  segments: WhisperSegment[];
}

export async function transcribeAudio(
  audioBuffer: Buffer,
  filename: string,
  apiKey?: string
): Promise<WhisperResult> {
  const key = apiKey || process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OpenAI API key required for Whisper transcription");

  if (audioBuffer.length > MAX_FILE_SIZE) {
    throw new Error(`Audio file too large (${(audioBuffer.length / 1024 / 1024).toFixed(1)}MB). Whisper API limit is 25MB.`);
  }

  const form = new FormData();
  form.append("file", audioBuffer, {
    filename: filename.endsWith(".mp3") ? filename : `${filename}.mp3`,
    contentType: "audio/mpeg",
  });
  form.append("model", "whisper-1");
  form.append("response_format", "verbose_json");
  form.append("timestamp_granularities[]", "segment");

  const resp = await axios.post(WHISPER_URL, form, {
    headers: {
      Authorization: `Bearer ${key}`,
      ...form.getHeaders(),
    },
    maxBodyLength: MAX_FILE_SIZE + 1024 * 1024, // buffer for form overhead
    timeout: 180000, // 3 minutes
  });

  const data = resp.data;

  const segments: WhisperSegment[] = (data.segments || []).map((s: any) => ({
    start: Number(s.start) || 0,
    end: Number(s.end) || 0,
    text: (s.text || "").trim(),
  }));

  return {
    text: data.text || "",
    language: data.language || "unknown",
    duration: data.duration || 0,
    segments,
  };
}
