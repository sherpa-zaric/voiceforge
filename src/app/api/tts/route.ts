import { NextRequest } from "next/server";

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

  const styleTag = style ? `<style>${style}</style>` : "";
  const assistantContent = `${styleTag}${text}`;

  const body = {
    model: "mimo-v2.5-tts",
    messages: [
      { role: "user", content: "Generate speech" },
      { role: "assistant", content: assistantContent },
    ],
    audio: {
      format: format || "wav",
      voice: voice || "Mia",
    },
    stream: false,
  };

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": apiKey,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errText = await response.text();
      return Response.json(
        { error: `MiMo API error: ${response.status} - ${errText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    const audioData = data.choices?.[0]?.message?.audio?.data;

    if (!audioData) {
      return Response.json(
        { error: "No audio data in response" },
        { status: 500 }
      );
    }

    return Response.json({ audio: audioData });
  } catch (err) {
    return Response.json(
      { error: `Request failed: ${err}` },
      { status: 500 }
    );
  }
}
