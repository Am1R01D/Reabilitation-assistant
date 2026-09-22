# RehabAssist — Home Rehabilitation Platform

A MedTech MVP for doctor-prescribed physical therapy with computer vision exercise tracking and AI-assisted recovery monitoring.

## Stack

- **Frontend:** Next.js 14, React, Tailwind CSS
- **Backend:** Next.js API Routes
- **Database:** SQLite (better-sqlite3)
- **Computer Vision:** MediaPipe Pose (browser-local)
- **AI Analysis:** Google Gemini API (server-side)

## Setup

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Add your Gemini API key to .env
# GEMINI_API_KEY=your_key_here

# Seed demo data
npm run db:seed

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Deploy to Vercel

The repository is ready for a Next.js deployment on Vercel:

1. Push this repository to GitHub, GitLab, or Bitbucket and import it in [Vercel](https://vercel.com/new).
2. Vercel detects the included `vercel.json` and runs `npm ci` followed by `npm run build`.
3. In **Settings → Environment Variables**, add a long, random `JWT_SECRET`. Add `GEMINI_API_KEY` if Gemini analysis is required.
4. Deploy. The project pins the Vercel Node.js runtime to `22.x`, required by the built-in SQLite driver.

On Vercel, the SQLite file is created under `/tmp`, which is writable but temporary. Demo accounts are seeded automatically on a new function instance (set `SEED_DEMO_DATA=false` to disable this). Check-ins and exercise records therefore do not survive a cold start or scale-out. Use a managed database before storing real patient data; the current setup is appropriate only for a demo deployment.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GEMINI_API_KEY` | Recommended | Google Gemini API key for recovery analysis |
| `JWT_SECRET` | Optional | Session signing secret (defaults to dev value) |
| `SEED_DEMO_DATA` | Optional | Seed demo accounts on Vercel function startup (default: `true`) |

Without `GEMINI_API_KEY`, the app uses a local fallback analysis engine.

## Demo Accounts

Password for all accounts: `password123`

| Role | Email |
|------|-------|
| Doctor | dr.smith@clinic.com |
| Patient | john.doe@email.com |
| Patient | maria.garcia@email.com |

## Features

- Patient daily check-in (pain, swelling, mobility, fatigue, sleep, compliance)
- Bicep curl exercise with live camera pose tracking
- Repetition counting and technique feedback via MediaPipe
- Progress charts (pain, mobility, compliance, exercise performance)
- Gemini-powered recovery analysis (structured data only, no video)
- Doctor dashboard with patient monitoring and alerts
- Smart alerts for clinician review
- Gamification (streaks, weekly goals)
- Human-in-the-loop safety messaging

## Safety

This application does NOT diagnose, prescribe, or modify treatment plans. AI provides monitoring insights only. All medical decisions remain with the clinician.
