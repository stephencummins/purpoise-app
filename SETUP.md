# Purpoise Setup Guide

Complete setup instructions for the Purpoise goal-setting application.

## Prerequisites

- Node.js 18+ and npm
- Supabase account
- Google AI Studio account (for Gemini API)
- Netlify account (for deployment)

## Step 1: Clone and Install

```bash
cd /path/to/purpoise-app
npm install
cd client && npm install
cd ../netlify/functions && npm install
```

## Step 2: Supabase Setup

1. Create a new project at [supabase.com](https://supabase.com)

2. Go to Project Settings > API and copy:
   - Project URL
   - Anon/Public Key

3. Run the database schema:
   - Go to SQL Editor in your Supabase dashboard
   - Copy the contents of `supabase/schema.sql`
   - Run the SQL script

4. Enable Anonymous Sign-ins:
   - Go to Authentication > Providers
   - Enable "Anonymous Sign-ins"

## Step 3: Get Gemini API Key

1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Create a new API key
3. Copy the key for later use

## Step 4: Configure Environment Variables

### Root directory `.env`
Create `.env` in the project root:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key
GEMINI_API_KEY=your_gemini_api_key
```

### Client directory `.env`
Create `client/.env`:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_API_URL=http://localhost:8888/.netlify/functions
```

## Step 5: Local Development

Run the development server:

```bash
# From project root
npm run dev
```

This will start:
- React frontend at `http://localhost:5173`
- Netlify functions at `http://localhost:8888/.netlify/functions`

## Step 6: Deploy to Netlify

### Option A: Deploy via Netlify CLI

```bash
npm install -g netlify-cli
netlify login
netlify init
netlify deploy --prod
```

### Option B: Deploy via Git

1. Push your code to GitHub
2. Go to [netlify.com](https://netlify.com)
3. Click "Add new site" > "Import an existing project"
4. Connect your GitHub repository
5. Configure build settings:
   - Build command: `npm run build`
   - Publish directory: `client/dist`
   - Functions directory: `netlify/functions`

6. Add environment variables in Netlify dashboard:
   - Go to Site Settings > Environment Variables
   - Add: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `GEMINI_API_KEY`

7. Deploy!

### Update Client Environment for Production

After deploying, update `client/.env`:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_API_URL=https://your-site.netlify.app/.netlify/functions
```

## Troubleshooting

### Database Connection Issues
- Verify Supabase URL and anon key are correct
- Check that Row Level Security policies are enabled
- Ensure anonymous auth is enabled in Supabase

### AI Chat Not Working
- Verify Gemini API key is valid
- Check function logs in Netlify dashboard
- Ensure the model name `gemini-2.0-flash-exp` is available (or update to latest model)

### CORS Errors
- Ensure Netlify functions have correct CORS headers
- Check that API_URL in client .env points to correct endpoint

### Build Failures
- Clear node_modules and reinstall: `rm -rf node_modules && npm install`
- Check that all dependencies are installed in all directories
- Verify Node.js version is 18+

## Project Structure

```
purpoise-app/
├── client/               # React frontend
│   ├── src/
│   │   ├── App.jsx      # Main application (single file)
│   │   └── index.css    # Tailwind CSS
│   └── package.json
├── netlify/
│   └── functions/       # Serverless functions
│       ├── chat.js      # Gemini AI chat endpoint
│       └── package.json
├── supabase/
│   └── schema.sql       # Database schema
├── netlify.toml         # Netlify configuration
└── package.json         # Root package.json
```

## Usage

### Creating a Goal

1. Click "New Goal" button
2. Chat with Purpoise assistant
3. Answer 2-3 questions about your goal
4. Purpoise will generate a structured plan
5. View your goal on the dashboard

### Managing Tasks

- Click on a goal card to view details
- Check/uncheck tasks to mark completion
- Habit tasks track streaks automatically
- Set RAG status (Red/Amber/Green) manually

### Calendar View

- View all tasks with due dates
- Navigate between months
- See task categories color-coded

## Next Steps

- Customize the theme colors in `client/tailwind.config.js`
- Add more task categories if needed
- Implement sharing functionality
- Add notifications for due tasks
- Set up analytics

## Support

For issues, check the troubleshooting section above or review:
- Supabase docs: https://supabase.com/docs
- Netlify docs: https://docs.netlify.com
- Gemini API docs: https://ai.google.dev/docs
