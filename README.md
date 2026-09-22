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
3. In **Settings → Environment Variables**, add the Supabase variables below and `GEMINI_API_KEY` if Gemini analysis is required.
4. Deploy. The project pins the Vercel Node.js runtime to `22.x`, required by the built-in SQLite driver.

On Vercel, the SQLite file is created under `/tmp`, which is writable but temporary. Use Supabase before storing real patient data.

### Supabase setup

1. Create a project at [Supabase](https://supabase.com/dashboard), then open **SQL Editor** and run [`supabase/schema.sql`](./supabase/schema.sql).
2. In the project **Connect** dialog, copy the Project URL and the **secret** API key. Add them to Vercel as `SUPABASE_URL` and `SUPABASE_SECRET_KEY`. The secret key must never be exposed through a `NEXT_PUBLIC_` variable.
3. To create the two zero-stat demo accounts, set the same variables in `.env.local` and run `npm run db:seed:supabase`.

The schema, server-only client, and seed command are included. The current application still uses local SQLite routes; migration of the API routes to Supabase is the next implementation step before production use.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GEMINI_API_KEY` | Recommended | Google Gemini API key for recovery analysis |
| `SEED_DEMO_DATA` | Optional | Seed demo accounts on Vercel function startup (default: `true`) |
| `SUPABASE_URL` | Required for Supabase | Project URL from Supabase Connect |
| `SUPABASE_SECRET_KEY` | Required for Supabase | Server-only secret API key from Supabase Connect |

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
