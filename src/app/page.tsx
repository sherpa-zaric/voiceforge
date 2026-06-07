"use client";

import { useState, useRef, useCallback, type DragEvent, type ChangeEvent } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Tab = "preset" | "design" | "clone";
type Status = "idle" | "loading" | "success" | "error";

interface VoiceOption {
  id: string;
  label: string;
  description: string;
}

interface StyleOption {
  id: string;
  label: string;
  tag: string;
}

interface DesignPreset {
  id: string;
  label: string;
  description: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const VOICES: VoiceOption[] = [
  { id: "Mia", label: "Mia", description: "Warm, natural female voice" },
  { id: "Chloe", label: "Chloe", description: "Bright, energetic female voice" },
  { id: "Milo", label: "Milo", description: "Friendly, casual male voice" },
  { id: "Dean", label: "Dean", description: "Deep, authoritative male voice" },
];

const STYLES: StyleOption[] = [
  { id: "", label: "None", tag: "" },
  { id: "happy", label: "Happy", tag: "happy" },
  { id: "sad", label: "Sad", tag: "sad" },
  { id: "angry", label: "Angry", tag: "angry" },
  { id: "calm", label: "Calm", tag: "calm" },
  { id: "excited", label: "Excited", tag: "excited" },
  { id: "scary", label: "Scary", tag: "scary" },
  { id: "whisper", label: "Whisper", tag: "whisper" },
];

const DESIGN_PRESETS: DesignPreset[] = [
  {
    id: "narrator",
    label: "British Narrator",
    description: "Warm British narrator, middle-aged, perfect for audiobooks and documentaries",
  },
  {
    id: "podcast",
    label: "Podcast Host",
    description: "Friendly, energetic young American female, great for podcasts and vlogs",
  },
  {
    id: "trailer",
    label: "Movie Trailer",
    description: "Deep, gravelly movie trailer voice with dramatic intensity",
  },
  {
    id: "robot",
    label: "Sci-Fi Robot",
    description: "Robotic, monotone AI voice with slight metallic resonance",
  },
  {
    id: "horror",
    label: "Horror Host",
    description: "Eerie, whispering voice with unsettling pauses, perfect for horror content",
  },
  {
    id: "anime",
    label: "Anime Character",
    description: "High-pitched, expressive anime-style voice with exaggerated emotions",
  },
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Strip the data:...;base64, prefix
      const base64 = result.split(",")[1] || "";
      resolve(base64);
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

async function webmToWav(blob: Blob): Promise<File> {
  const ctx = new AudioContext();
  const arrayBuffer = await blob.arrayBuffer();
  const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
  const numChannels = audioBuffer.numberOfChannels;
  const sampleRate = audioBuffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;
  const dataLength = audioBuffer.length * numChannels * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataLength);
  const view = new DataView(buffer);

  // WAV header
  const writeStr = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };
  writeStr(0, "RIFF");
  view.setUint32(4, 36 + dataLength, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  writeStr(36, "data");
  view.setUint32(40, dataLength, true);

  // Interleave channels
  const channels: Float32Array[] = [];
  for (let i = 0; i < numChannels; i++) {
    channels.push(audioBuffer.getChannelData(i));
  }
  let offset = 44;
  for (let i = 0; i < audioBuffer.length; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const sample = Math.max(-1, Math.min(1, channels[ch][i]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      offset += 2;
    }
  }

  ctx.close();
  return new File([buffer], "recorded-voice.wav", { type: "audio/wav" });
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`relative flex-1 py-3 px-4 text-sm font-medium transition-colors cursor-pointer ${
        active
          ? "text-foreground"
          : "text-muted hover:text-foreground/70"
      }`}
    >
      {children}
      {active && (
        <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-accent rounded-full" />
      )}
    </button>
  );
}

function AudioPlayer({ src }: { src: string }) {
  return (
    <div className="mt-4">
      <audio controls src={src} className="w-full" />
    </div>
  );
}

function StatusMessage({
  status,
  error,
}: {
  status: Status;
  error: string | null;
}) {
  if (status === "loading") {
    return (
      <div className="flex items-center gap-2 text-accent mt-4">
        <svg
          className="animate-spin h-5 w-5"
          viewBox="0 0 24 24"
          fill="none"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
        <span className="text-sm">Generating audio...</span>
      </div>
    );
  }
  if (status === "error" && error) {
    return (
      <div className="mt-4 p-3 rounded-lg bg-error/10 border border-error/30 text-error text-sm">
        {error}
      </div>
    );
  }
  return null;
}

// ---------------------------------------------------------------------------
// Preset Voices Tab
// ---------------------------------------------------------------------------

function PresetTab() {
  const [text, setText] = useState("");
  const [voice, setVoice] = useState("Mia");
  const [style, setStyle] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [audioSrc, setAudioSrc] = useState<string | null>(null);

  const handleGenerate = useCallback(async () => {
    if (!text.trim()) return;
    if (text.length > 2500) {
      setError("Text exceeds 2,500 character limit. Please shorten your text.");
      setStatus("error");
      return;
    }
    setStatus("loading");
    setError(null);
    setAudioSrc(null);

    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text.trim(), voice, style: style || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generation failed");
      setAudioSrc(`data:audio/wav;base64,${data.audio}`);
      setStatus("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setStatus("error");
    }
  }, [text, voice, style]);

  return (
    <div className="space-y-5">
      {/* Voice selector */}
      <div>
        <label className="block text-sm font-medium text-foreground/80 mb-2">
          Voice
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {VOICES.map((v) => (
            <button
              key={v.id}
              onClick={() => setVoice(v.id)}
              className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
                voice === v.id
                  ? "border-accent bg-accent-muted"
                  : "border-card-border bg-card hover:border-accent/50"
              }`}
            >
              <span className="block text-sm font-medium">{v.label}</span>
              <span className="block text-xs text-muted mt-0.5">
                {v.description}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Style selector */}
      <div>
        <label className="block text-sm font-medium text-foreground/80 mb-2">
          Emotion / Style
        </label>
        <div className="flex flex-wrap gap-2">
          {STYLES.map((s) => (
            <button
              key={s.id}
              onClick={() => setStyle(s.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                style === s.id
                  ? "bg-accent text-white"
                  : "bg-card border border-card-border text-muted hover:text-foreground hover:border-accent/50"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Text input */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-foreground/80">
            Text to speak
          </label>
          <span className={`text-xs ${text.length > 2500 ? "text-error" : text.length > 2000 ? "text-yellow-500" : "text-muted"}`}>
            {text.length.toLocaleString()} / 2,500 chars
          </span>
        </div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type what you want the voice to say..."
          rows={4}
          className="w-full p-3 rounded-lg bg-card border border-card-border text-foreground placeholder:text-muted/60 focus:outline-none focus:border-accent resize-none"
        />
        {text.length > 2500 && (
          <p className="text-xs text-error mt-1">
            Text exceeds 2,500 character limit. Please shorten your text.
          </p>
        )}
      </div>

      {/* Generate button */}
      <button
        onClick={handleGenerate}
        disabled={status === "loading" || !text.trim()}
        className="w-full py-3 rounded-lg bg-accent text-white font-medium transition-colors hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
      >
        {status === "loading" ? "Generating..." : "Generate Speech"}
      </button>

      <StatusMessage status={status} error={error} />
      {audioSrc && <AudioPlayer src={audioSrc} />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Voice Design Tab
// ---------------------------------------------------------------------------

function DesignTab() {
  const [text, setText] = useState("");
  const [voiceDescription, setVoiceDescription] = useState("");
  const [style, setStyle] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [audioSrc, setAudioSrc] = useState<string | null>(null);

  const handleGenerate = useCallback(async () => {
    if (!text.trim() || !voiceDescription.trim()) return;
    if (text.length > 2500) {
      setError("Text exceeds 2,500 character limit. Please shorten your text.");
      setStatus("error");
      return;
    }
    setStatus("loading");
    setError(null);
    setAudioSrc(null);

    try {
      const res = await fetch("/api/voice-design", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: text.trim(),
          voiceDescription: voiceDescription.trim(),
          style: style || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generation failed");
      setAudioSrc(`data:audio/wav;base64,${data.audio}`);
      setStatus("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setStatus("error");
    }
  }, [text, voiceDescription, style]);

  return (
    <div className="space-y-5">
      {/* Quick presets */}
      <div>
        <label className="block text-sm font-medium text-foreground/80 mb-2">
          Quick Presets
        </label>
        <div className="flex flex-wrap gap-2">
          {DESIGN_PRESETS.map((p) => (
            <button
              key={p.id}
              onClick={() => setVoiceDescription(p.description)}
              className="px-3 py-1.5 rounded-full text-xs font-medium bg-card border border-card-border text-muted hover:text-foreground hover:border-accent/50 transition-colors cursor-pointer"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Voice description */}
      <div>
        <label className="block text-sm font-medium text-foreground/80 mb-2">
          Voice Description
        </label>
        <textarea
          value={voiceDescription}
          onChange={(e) => setVoiceDescription(e.target.value)}
          placeholder='e.g. "Warm British narrator, middle-aged, with a slight rasp"'
          rows={3}
          className="w-full p-3 rounded-lg bg-card border border-card-border text-foreground placeholder:text-muted/60 focus:outline-none focus:border-accent resize-none"
        />
        <p className="text-xs text-muted mt-1">
          Describe the voice you want in plain English. The AI will create it.
        </p>
      </div>

      {/* Style selector */}
      <div>
        <label className="block text-sm font-medium text-foreground/80 mb-2">
          Emotion / Style
        </label>
        <div className="flex flex-wrap gap-2">
          {STYLES.map((s) => (
            <button
              key={s.id}
              onClick={() => setStyle(s.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                style === s.id
                  ? "bg-accent text-white"
                  : "bg-card border border-card-border text-muted hover:text-foreground hover:border-accent/50"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Text input */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-foreground/80">
            Text to speak
          </label>
          <span className={`text-xs ${text.length > 2500 ? "text-error" : text.length > 2000 ? "text-yellow-500" : "text-muted"}`}>
            {text.length.toLocaleString()} / 2,500 chars
          </span>
        </div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type what you want the voice to say..."
          rows={4}
          className="w-full p-3 rounded-lg bg-card border border-card-border text-foreground placeholder:text-muted/60 focus:outline-none focus:border-accent resize-none"
        />
        {text.length > 2500 && (
          <p className="text-xs text-error mt-1">
            Text exceeds 2,500 character limit. Please shorten your text.
          </p>
        )}
      </div>

      {/* Generate button */}
      <button
        onClick={handleGenerate}
        disabled={
          status === "loading" || !text.trim() || !voiceDescription.trim()
        }
        className="w-full py-3 rounded-lg bg-accent text-white font-medium transition-colors hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
      >
        {status === "loading" ? "Generating..." : "Generate Voice"}
      </button>

      <StatusMessage status={status} error={error} />
      {audioSrc && <AudioPlayer src={audioSrc} />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Voice Clone Tab
// ---------------------------------------------------------------------------

function CloneTab() {
  const [text, setText] = useState("");
  const [style, setStyle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [audioSrc, setAudioSrc] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [recording, setRecording] = useState(false);
  const [recordDuration, setRecordDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const validateAndSetFile = useCallback((f: File) => {
    setFileError(null);
    if (f.size > MAX_FILE_SIZE) {
      setFileError("File too large. Maximum size is 10 MB.");
      return;
    }
    const ext = f.name.split(".").pop()?.toLowerCase();
    if (
      ext !== "wav" && ext !== "mp3" && ext !== "webm" &&
      f.type !== "audio/wav" && f.type !== "audio/mpeg" && f.type !== "audio/webm"
    ) {
      setFileError("Only WAV, MP3, and recorded audio are supported.");
      return;
    }
    setFile(f);
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setDragging(false);
      const f = e.dataTransfer.files[0];
      if (f) validateAndSetFile(f);
    },
    [validateAndSetFile]
  );

  const handleFileChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      if (f) validateAndSetFile(f);
    },
    [validateAndSetFile]
  );

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const wavFile = await webmToWav(blob);
        validateAndSetFile(wavFile);
        stream.getTracks().forEach((t) => t.stop());
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setRecording(true);
      setRecordDuration(0);
      recordTimerRef.current = setInterval(() => {
        setRecordDuration((d) => d + 1);
      }, 1000);
    } catch {
      setFileError("Microphone access denied. Please allow microphone access.");
    }
  }, [validateAndSetFile]);

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
    if (recordTimerRef.current) {
      clearInterval(recordTimerRef.current);
      recordTimerRef.current = null;
    }
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!text.trim() || !file) return;
    if (text.length > 2500) {
      setError("Text exceeds 2,500 character limit. Please shorten your text.");
      setStatus("error");
      return;
    }
    setStatus("loading");
    setError(null);
    setAudioSrc(null);

    try {
      const base64 = await fileToBase64(file);
      const res = await fetch("/api/voice-clone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: text.trim(),
          audioBase64: base64,
          mimeType: file.type || "audio/wav",
          style: style || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generation failed");
      setAudioSrc(`data:audio/wav;base64,${data.audio}`);
      setStatus("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setStatus("error");
    }
  }, [text, file, style]);

  return (
    <div className="space-y-5">
      {/* File upload area */}
      <div>
        <label className="block text-sm font-medium text-foreground/80 mb-2">
          Voice Sample Audio
        </label>
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`relative flex flex-col items-center justify-center p-8 rounded-lg border-2 border-dashed transition-colors cursor-pointer ${
            dragging
              ? "border-accent bg-accent-muted"
              : file
                ? "border-success/50 bg-success/5"
                : "border-card-border bg-card hover:border-accent/50"
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".wav,.mp3,audio/wav,audio/mpeg"
            onChange={handleFileChange}
            className="hidden"
          />
          {file ? (
            <>
              <svg
                className="w-8 h-8 text-success mb-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              <span className="text-sm font-medium">{file.name}</span>
              <span className="text-xs text-muted mt-1">
                {(file.size / 1024 / 1024).toFixed(1)} MB &mdash; Click or
                drop to replace
              </span>
            </>
          ) : (
            <>
              <svg
                className="w-8 h-8 text-muted mb-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
              <span className="text-sm text-muted">
                Drop an audio file here or click to browse
              </span>
              <span className="text-xs text-muted/60 mt-1">
                WAV, MP3 &middot; Max 10 MB
              </span>
            </>
          )}
        </div>
        {fileError && (
          <p className="text-xs text-error mt-1">{fileError}</p>
        )}
        {/* Record button */}
        <div className="flex items-center gap-3 mt-3">
          <span className="text-xs text-muted">or</span>
          <button
            onClick={recording ? stopRecording : startRecording}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
              recording
                ? "bg-error/20 border border-error/50 text-error"
                : "bg-card border border-card-border text-muted hover:text-foreground hover:border-accent/50"
            }`}
          >
            {recording ? (
              <>
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-error opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-error" />
                </span>
                Recording {Math.floor(recordDuration / 60)}:
                {String(recordDuration % 60).padStart(2, "0")}
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
                Record Audio
              </>
            )}
          </button>
        </div>
      </div>

      {/* Style selector */}
      <div>
        <label className="block text-sm font-medium text-foreground/80 mb-2">
          Emotion / Style
        </label>
        <div className="flex flex-wrap gap-2">
          {STYLES.map((s) => (
            <button
              key={s.id}
              onClick={() => setStyle(s.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                style === s.id
                  ? "bg-accent text-white"
                  : "bg-card border border-card-border text-muted hover:text-foreground hover:border-accent/50"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Text input */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-foreground/80">
            Text to speak
          </label>
          <span className={`text-xs ${text.length > 2500 ? "text-error" : text.length > 2000 ? "text-yellow-500" : "text-muted"}`}>
            {text.length.toLocaleString()} / 2,500 chars
          </span>
        </div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type what you want the cloned voice to say..."
          rows={4}
          className="w-full p-3 rounded-lg bg-card border border-card-border text-foreground placeholder:text-muted/60 focus:outline-none focus:border-accent resize-none"
        />
        {text.length > 2500 && (
          <p className="text-xs text-error mt-1">
            Text exceeds 2,500 character limit. Please shorten your text.
          </p>
        )}
      </div>

      {/* Generate button */}
      <button
        onClick={handleGenerate}
        disabled={status === "loading" || !text.trim() || !file}
        className="w-full py-3 rounded-lg bg-accent text-white font-medium transition-colors hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
      >
        {status === "loading" ? "Cloning Voice..." : "Clone & Generate"}
      </button>

      <StatusMessage status={status} error={error} />
      {audioSrc && <AudioPlayer src={audioSrc} />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function Home() {
  const [tab, setTab] = useState<Tab>("preset");

  return (
    <div className="flex flex-col flex-1 items-center bg-background">
      <main className="w-full max-w-2xl px-4 py-12 sm:py-20">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">
            Voice<span className="text-accent">Forge</span>
          </h1>
          <p className="text-muted mt-3 text-base">
            AI Voice Studio &mdash; Design, clone, and generate voices with AI
          </p>
        </div>

        {/* Tab bar */}
        <div className="flex border-b border-card-border mb-8">
          <TabButton active={tab === "preset"} onClick={() => setTab("preset")}>
            Preset Voices
          </TabButton>
          <TabButton active={tab === "design"} onClick={() => setTab("design")}>
            Voice Design
          </TabButton>
          <TabButton active={tab === "clone"} onClick={() => setTab("clone")}>
            Voice Clone
          </TabButton>
        </div>

        {/* Tab content */}
        {tab === "preset" && <PresetTab />}
        {tab === "design" && <DesignTab />}
        {tab === "clone" && <CloneTab />}
      </main>
    </div>
  );
}
