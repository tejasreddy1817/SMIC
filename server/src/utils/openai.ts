import axios from "axios";

const OPENAI_BASE = "https://api.openai.com/v1";

export async function createEmbedding(apiKey: string, input: string) {
  const resp = await axios.post(
    `${OPENAI_BASE}/embeddings`,
    { model: "text-embedding-3-small", input },
    { headers: { Authorization: `Bearer ${apiKey}` } },
  );
  const data = resp.data?.data;
  if (!Array.isArray(data) || !data[0]?.embedding) {
    throw new Error("Invalid embedding response from OpenAI");
  }
  return data[0].embedding as number[];
}

export async function chatCompletion(apiKey: string, messages: any[], opts: any = {}) {
  const { timeout: customTimeout, ...restOpts } = opts;
  const resp = await axios.post(
    `${OPENAI_BASE}/chat/completions`,
    { model: "gpt-4o-mini", messages, ...restOpts },
    { headers: { Authorization: `Bearer ${apiKey}` }, timeout: customTimeout || 90000 },
  );
  return resp.data;
}

/**
 * Safely extract JSON from an OpenAI response, handling markdown code block wrappers.
 * Returns parsed JSON or null if parsing fails.
 */
export function safeParseJson(raw: string): any | null {
  if (!raw) return null;
  let text = raw.trim();
  // Strip markdown code fences: ```json ... ``` or ``` ... ```
  const fenceMatch = text.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?\s*```$/);
  if (fenceMatch) text = fenceMatch[1].trim();
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
