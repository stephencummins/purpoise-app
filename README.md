# Purpoise - AI-Powered Goal Setting & Task Management

*Because every goal needs a purpose!* 🐬

A conversational AI assistant that helps you break down large goals into structured, staged plans with categorized tasks.

## Tech Stack

- **Frontend**: React + Vite + Tailwind CSS
- **Backend**: Node.js + Express (Netlify Functions)
- **Database**: Supabase (PostgreSQL)
- **AI**: Google Gemini 2.5 Flash
- **Deployment**: Netlify

## Features

- 🤖 Conversational AI goal creation
- 📊 Dashboard with progress tracking
- 📅 Calendar view for task scheduling
- 🎯 Task categorization (work, thought, collaboration, study, research, action, habit)
- 🔥 Habit streak tracking
- 📈 RAG status indicators (Red, Amber, Green)
- 📝 Weekly digest

## Setup

1. Install dependencies:
```bash
npm run install:all
```

2. Set up environment variables:

Create `.env` in the root:
```
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
GEMINI_API_KEY=your_gemini_api_key
```

Create `client/.env`:
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

3. Set up Supabase database:

Run the SQL schema in `supabase/schema.sql`

4. Run development server:
```bash
npm run dev
```

## Deployment

The app is configured for Netlify deployment with serverless functions.

1. Connect your repository to Netlify
2. Set environment variables in Netlify dashboard
3. Deploy!

## Design Theme

Inspired by 1940s UK rail travel posters with a vintage aesthetic:
- Pale cream background (#FDFCEC)
- Orange/Lemon accents (#F97316)
- Dark brown text (#3D2C21)
- Classic serif headings
