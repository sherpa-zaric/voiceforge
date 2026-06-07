@AGENTS.md

# Project: VoiceForge — AI Voice Studio

## GitHub Account
- **Repository**: https://github.com/sherpa-zaric/voiceforge
- **GitHub Account**: sherpa-zaric (use `gh auth switch --hostname github.com --user sherpa-zaric`)
- **Vercel Team**: zac-s-projects12 (use `--scope zac-s-projects12`)
- **Production URL**: https://voiceforge-alpha.vercel.app

## Deployment
- Push to GitHub: `git push` (after switching to sherpa-zaric account)
- Deploy to Vercel: `vercel --prod --yes --scope zac-s-projects12`
- SSO protection: Disabled via `vercel project protection disable voiceforge --sso --scope zac-s-projects12`

## API Key
- MiMo API key is in `.env.local` (MIMO_API_KEY, MIMO_BASE_URL)
- For Vercel: set via `vercel env add MIMO_API_KEY production --scope zac-s-projects12`

## Tech Stack
- Next.js 16 + TypeScript + TailwindCSS 4
- MiMo TTS API (mimo-v2.5-tts series)
- jszip for EPUB parsing
- Vercel Analytics for visitor tracking
