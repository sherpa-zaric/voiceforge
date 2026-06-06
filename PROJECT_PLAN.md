# VoiceForge — AI Voice Studio

## Project Overview

A web-based AI voice studio for English-speaking content creators. Users can create unique AI voices through text descriptions (Voice Design), clone voices from audio samples (Voice Clone), and use preset voices with emotion/style controls.

**Target Market**: English-speaking users (US market focus)
**Differentiator**: Voice Design — generate custom voices from plain English descriptions, no audio sample needed

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16 (App Router) + TypeScript + TailwindCSS 4 |
| Backend | Next.js API Routes (Route Handlers) |
| TTS Engine | Xiaomi MiMo API (mimo-v2.5-tts series) |
| ASR Engine | Xiaomi MiMo API (mimo-v2.5-asr) |
| Deployment | Local dev first, Vercel later |

---

## Xiaomi MiMo API Models Used

| Model | Purpose | Status |
|-------|---------|--------|
| `mimo-v2.5-tts` | Preset voice TTS (Mia/Chloe/Milo/Dean) | API route created |
| `mimo-v2.5-tts-voicedesign` | Generate custom voice from text description | API route created |
| `mimo-v2.5-tts-voiceclone` | Clone voice from audio sample | API route created |
| `mimo-v2.5-asr` | Speech-to-text (voice clone input helper) | Not yet integrated |

**Pricing**: All models are currently free ("限时免费")

---

## File Structure

```
voiceforge/
├── .env.local                          # MIMO_API_KEY, MIMO_BASE_URL
├── PROJECT_PLAN.md                     # This file
├── src/
│   └── app/
│       ├── layout.tsx                  # Root layout (DONE)
│       ├── globals.css                 # Dark theme styling (DONE)
│       ├── page.tsx                    # Main page UI (TODO)
│       └── api/
│           ├── tts/
│           │   └── route.ts            # Preset voice TTS API (DONE)
│           ├── voice-design/
│           │   └── route.ts            # Voice Design API (DONE)
│           └── voice-clone/
│               └── route.ts            # Voice Clone API (DONE)
```

---

## Current Progress

### DONE

- [x] **Project scaffolding** — Next.js 16 + TypeScript + TailwindCSS initialized
- [x] **API route: `/api/tts`** — Proxies to `mimo-v2.5-tts` with preset voice + style tag support
- [x] **API route: `/api/voice-design`** — Proxies to `mimo-v2.5-tts-voicedesign` with voice description input
- [x] **API route: `/api/voice-clone`** — Proxies to `mimo-v2.5-tts-voiceclone` with base64 audio input
- [x] **Layout & theme** — Dark theme, metadata, Geist fonts configured
- [x] **`globals.css`** — Custom dark theme variables, scrollbar, pulse animation
- [x] **`.env.local`** — Environment variable template for API key

### DONE (Phase 1 & 2)

- [x] **Main page UI (`page.tsx`)** — 3-tab interface: Preset Voices, Voice Design, Voice Clone
- [x] **Audio playback component** — `<audio>` element plays base64 WAV returned from API
- [x] **Loading & error states** — Spinner during API calls, red error messages, success feedback
- [x] **Voice Clone file upload** — Drag-and-drop + click-to-browse, base64 encoding, size validation (≤10MB)
- [x] **Voice Design presets** — 6 quick-fill presets (British Narrator, Podcast Host, Movie Trailer, Sci-Fi Robot, Horror Host, Anime Character)
- [x] **Style tag UI** — 8 emotion/style chips (None, Happy, Sad, Angry, Calm, Excited, Scary, Whisper)
- [x] **`npm run dev` testing** — All 3 tabs verified end-to-end with real API calls
- [x] **API key setup** — User configured `.env.local` with valid MiMo API key

### NOT YET DONE

- [ ] **ASR integration** — Optional: transcribe uploaded audio to verify content
- [ ] **Audio download** — Button to download generated WAV files
- [ ] **History** — Local storage of recent generations
- [ ] **Vercel deployment** — Deploy to production

---

## Next Steps (Priority Order)

### Phase 1: Core UI (Immediate)

1. **Build `page.tsx`** — Main interface with 3 tabs:
   - **Preset Voices**: Text input + voice selector (Mia/Chloe/Milo/Dean) + style controls → `/api/tts`
   - **Voice Design**: Text input + voice description textarea → `/api/voice-design`
   - **Voice Clone**: Text input + audio file upload → `/api/voice-clone`

2. **Audio playback** — `<audio>` element that plays base64 WAV returned from API

3. **Loading/error states** — Show spinner during API calls, display errors clearly

### Phase 2: Polish & UX

4. **Voice Design presets** — Quick-fill buttons:
   - "Warm British narrator, middle-aged"
   - "Energetic young American female"
   - "Deep, gravelly movie trailer voice"
   - "Friendly podcast host"

5. **Style tag controls** — Dropdown for emotions (Happy, Sad, Angry, Calm, Excited, Scary, Whisper)

6. **Voice Clone UX** — Drag-and-drop upload, audio preview, format validation

### Phase 3: Enhancements

7. **ASR integration** — Optional: transcribe uploaded audio to verify content
8. **Audio download** — Button to download generated WAV files
9. **History** — Local storage of recent generations
10. **Vercel deployment** — Deploy to production

---

## How to Run Locally

```bash
cd /Users/zhaozhenchao/codes/tts_project/voiceforge

# 1. Set your API key in .env.local
# Edit .env.local and replace "your_api_key_here" with actual key

# 2. Install dependencies (already done)
npm install

# 3. Start dev server
npm run dev
```

Then open http://localhost:3000

---

## API Key Setup

1. Go to https://platform.xiaomimimo.com
2. Create an account / log in
3. Navigate to API Keys section
4. Create a new API key
5. Copy the key and paste into `.env.local`:
   ```
   MIMO_API_KEY=your_actual_key_here
   ```

---

## Search Volume Data (US Market)

Based on keyword research, the following niches have the best opportunity:

| Niche | Keywords | Monthly Volume | Competition |
|-------|----------|---------------|-------------|
| General TTS | "free text to voice" | 40,500 | Medium |
| Horror/Scary | "scary voice text to speech" | 1,000-1,600 | Very Low |
| Robot/Voice effects | "robot voice text to speech" | 880-1,300 | Very Low |
| TikTok/Short video | "tiktok voice text to speech" | 320-590 | Very Low |
| Anime | "anime voice text to speech" | 50-140 (growing) | Very Low |
| Narrator/Audiobook | "text to speech human voice" | 2,900-4,400 | Low |
