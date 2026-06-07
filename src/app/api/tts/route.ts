import { NextRequest } from "next/server";

const MAX_CHUNK = 2500;

function splitText(text: string): string[] {
  if (text.length <= MAX_CHUNK) return [text];
  const chunks: string[] = [];
  let remaining = text;
  while (remaining.length > 0) {
    if (remaining.length <= MAX_CHUNK) {
      chunks.push(remaining);
      break;
    }
    let cut = remaining.lastIndexOf(".", MAX_CHUNK);
    if (cut < MAX_CHUNK * 0.5) cut = remaining.lastIndexOf("!", MAX_CHUNK);
    if (cut < MAX_CHUNK * 0.5) cut = remaining.lastIndexOf("?", MAX_CHUNK);
    if (cut < MAX_CHUNK * 0.5) cut = remaining.lastIndexOf(";", MAX_CHUNK);
    if (cut < MAX_CHUNK * 0.5) cut = remaining.lastIndexOf(",", MAX_CHUNK);
    if (cut < MAX_CHUNK * 0.5) cut = MAX_CHUNK;
    else cut += 1;
    chunks.push(remaining.slice(0, cut).trim());
    remaining = remaining.slice(cut).trim();
  }
  return chunks;
}

function mergeWavBase64(chunks: string[]): string {
  if (chunks.length === 1) return chunks[0];
  const parts = chunks.map((b64) => {
    const raw = Buffer.from(b64, "base64");
    return raw.subarray(44);
  });
  const totalLen = parts.reduce((s, p) => s + p.length, 0);
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + totalLen, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(24000, 24);
  header.writeUInt32LE(48000, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36);
  header.writeUInt32LE(totalLen, 40);
  const merged = Buffer.concat([header, ...parts]);
  return merged.toString("base64");
}

async function callTTS(
  text: string,
  voice: string,
  style: string | undefined,
  apiKey: string,
  baseUrl: string,
): Promise<string> {
  const styleTag = style ? `<style>${style}</style>` : "";
  const body = {
    model: "mimo-v2.5-tts",
    messages: [
      { role: "user", content: "Generate speech" },
      { role: "assistant", content: `${styleTag}${text}` },
    ],
    audio: { format: "wav", voice: voice || "Mia" },
    stream: false,
  };
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "api-key": apiKey },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`MiMo API error: ${res.status}`);
  const data = await res.json();
  const audio = data.choices?.[0]?.message?.audio?.data;
  if (!audio) throw new Error("No audio data in response");
  return audio;
}

export async function POST(request: NextRequest) {
  const { text, voice, style, format } = await request.json();

  const apiKey = process.env.MIMO_API_KEY;
  const baseUrl = process.env.MIMO_BASE_URL || "https://api.xiaomimimo.com/v1";

  if (!apiKey || apiKey === "your_api_key_here") {
    return Response.json(
      { error: "MIMO_API_KEY is not configured. Please set it in .env.local" },
      { status: 500 }
    );
  }

  try {
    const chunks = splitText(text);
    const audioChunks: string[] = [];
    for (const chunk of chunks) {
      const audio = await callTTS(chunk, voice, style, apiKey, baseUrl);
      audioChunks.push(audio);
    }
    const merged = mergeWavBase64(audioChunks);
    return Response.json({ audio: merged });
  } catch (err) {
    return Response.json(
      { error: `Request failed: ${err}` },
      { status: 500 }
    );
  }
}
