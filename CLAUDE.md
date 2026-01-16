# Purpoise App - Development Context

## Project Overview
Purpoise is an AI-powered goal-setting and task management application that helps users break down their goals into structured, actionable plans. The name is a pun on "purpose" and "porpoise" - because every goal needs a purpose!

The app has evolved into a **productivity hub** combining goal management with integrated news aggregation, Wikipedia content, and weather information - all wrapped in a distinctive futuristic retro design aesthetic.

## Recent Development Work (January 2026)

### News & Information Hub Features

#### NewsView Component
A full-featured news terminal with cyberpunk/futuristic retro aesthetic:
- **Multi-source RSS aggregation** from BBC, Guardian, Reuters, NYT, and Paddo.dev
- **Content sections**:
  - Main news articles (3-column grid)
  - "PULSE MONITOR" - Trending content from Google/Reddit/YouTube
  - "NEURAL FEED" - AI-specific news filtered by isAI flag
  - "QUARANTINE ZONE" - Trump-related content (collapsible)
  - "PRINT ARCHIVE" - Newspaper PDF links
- **Design features**: Dark theme (bg-slate-950), cyan/gold accents, scanline effects, animated shimmer, terminal-style sections

#### WikipediaView Component
Displays Wikipedia Main Page content:
- Featured Article with content preview
- In the News with featured image
- Did You Know facts
- On This Day historical events

#### Dashboard Widgets
- **WeatherWidget**: Weather for Southend-on-Sea, Essex using Open-Meteo API
- **NewsDigestWidget**: Top 5 BBC headlines with time-based positioning (moves from main content to sidebar after 11am)
- **RecurringTasksWidget**: Daily/Weekly tasks with progress counters, colour-coded borders

### Core Goal Management Features

#### AI Chat Function
**Location:** [netlify/functions/chat.js](netlify/functions/chat.js)

- Uses Google Gemini 2.0 Flash (Experimental)
- Context-aware: receives user's existing goals
- Can CREATE new goals and MODIFY existing ones
- UK localisation (British English, en-GB locale, UK date formats)
- Strips markdown code blocks from AI responses

#### Goal Modification
The AI can modify existing goals with operations:
- **Update goal metadata**: Change title or description
- **Add tasks**: Insert new tasks to any stage
- **Remove tasks**: Delete specific tasks by index
- **Update tasks**: Modify task text, category, completion status, or due date

## Architecture

### Tech Stack
- **Frontend**: React + Vite + Tailwind CSS
- **Backend**: Netlify Functions
- **Database**: Supabase (PostgreSQL)
- **AI**: Google Gemini 2.0 Flash (Experimental)
- **External APIs**: Open-Meteo (weather), RSS feeds, Wikipedia

### Key Views & Components

#### Main Views
1. **Dashboard**: Goals grid, weather, news digest, recurring tasks with time-based widget positioning
2. **News**: Full terminal-style news aggregator with futuristic retro design
3. **Wikipedia**: Wikipedia Main Page content display
4. **Goal Detail**: Single goal with stages and tasks (modal-like)
5. **Calendar**: Month view of all tasks by due date

#### Dashboard Widgets
- **WeatherWidget**: Temperature, sunshine %, rain for Southend-on-Sea (Open-Meteo API)
- **NewsDigestWidget**: Top 5 BBC headlines, repositions based on time of day
- **RecurringTasksWidget**: Daily/Weekly tasks with progress counters (e.g., "3/5")

### Netlify Functions

| Function | Purpose |
|----------|---------|
| `/chat` | AI conversation using Gemini for goal creation/modification |
| `/news-feeds` | RSS aggregation from 5 sources with content classification |
| `/trending` | Google Trends, Reddit popular, YouTube trending |
| `/wikipedia` | Wikipedia Main Page scraping and parsing |
| `/newspapers` | Newspaper PDF links and cover images |

### Data Model
- **Goals**: Top-level objectives with title, description, RAG status
- **Stages**: Phases within a goal (ordered)
- **Tasks**: Individual action items with categories, due dates, completion status

### Task Categories
- work
- thought
- collaboration
- study
- research
- action
- habit (includes streak tracking)

## Development Commands

```bash
# Install all dependencies
npm run install:all

# Run development servers (client + functions)
npm run dev

# Build for production
npm run build
```

## Environment Variables

### Client (.env)
```
VITE_SUPABASE_URL=https://qpmewfobfnbprlnfgayh.supabase.co
VITE_SUPABASE_ANON_KEY=[key]
VITE_API_URL=http://localhost:9999/.netlify/functions  # Local dev
# VITE_API_URL=/.netlify/functions  # Production
```

### Root (.env)
```
SUPABASE_URL=https://qpmewfobfnbprlnfgayh.supabase.co
SUPABASE_ANON_KEY=[key]
GEMINI_API_KEY=[key]
```

## Deployment

### Netlify Configuration
The app is configured for deployment on Netlify with:
- Build command: `npm run build`
- Publish directory: `client/dist`
- Functions directory: `netlify/functions`
- Base directory: `client`

### Important Notes for Deployment
1. Set environment variables in Netlify dashboard (both VITE_ prefixed for client and non-prefixed for functions)
2. Ensure Gemini API key has sufficient quota
3. Supabase tables must be set up with proper schema (goals, stages, tasks)

## Known Issues & Solutions

### Issue: "Sorry, I encountered an error"
**Cause:** Gemini API quota exceeded (429 error)
**Solution:** Wait for quota reset or upgrade Gemini API plan

### Issue: Chat returns raw JSON
**Cause:** AI wrapping response in markdown code blocks
**Solution:** Implemented code block stripping in chat function (already fixed)

### Issue: Development server not starting
**Cause:** Port conflicts or incorrect netlify.toml configuration
**Solution:** Use `netlify dev` or run client and functions separately as configured

## Future Enhancements
- Add user authentication beyond anonymous users
- Implement goal sharing functionality
- Add AI-powered progress insights and recommendations
- Mobile responsive improvements
- More customisable widget positioning

## File Structure
```
purpoise-app/
├── client/                  # React frontend
│   ├── src/
│   │   ├── App.jsx         # Main application (all components inline, ~2800 lines)
│   │   ├── main.jsx        # Entry point
│   │   ├── App.css         # Global styles
│   │   ├── index.css       # Tailwind directives
│   │   └── tarotData.js    # Tarot card data (for fun feature)
│   ├── .env                # Client environment variables
│   ├── tailwind.config.js  # Extended colour palette (turquoise, chocolate, gold)
│   └── vite.config.js      # Vite configuration
├── netlify/
│   └── functions/
│       ├── chat.js         # AI chat (Gemini)
│       ├── news-feeds.js   # RSS aggregation
│       ├── trending.js     # Google/Reddit/YouTube trending
│       ├── wikipedia.js    # Wikipedia scraping
│       └── newspapers.js   # Newspaper PDFs
├── netlify.toml            # Netlify configuration
├── package.json            # Root package.json with scripts
└── CLAUDE.md               # This file
```

## Design System

### Colour Palette (tailwind.config.js)
- **turquoise**: 50-900 (cyan-like, used for news terminal borders/glows)
- **chocolate**: 50-900 (warm brown tones)
- **gold**: 50-900 (yellow/orange accents)
- **vintage-orange**: #F97316
- **cream**: #F5F5F0 (background)

### News Terminal Aesthetic
The NewsView uses a distinctive futuristic retro/cyberpunk design:
- Dark slate background (bg-slate-950)
- Cyan borders and glow effects
- Gold corner decorations and accents
- Scanline effects on hover
- Animated shimmer and staggered entrance animations
- Grid backgrounds and clip-path decorations

### Content Filtering
The news-feeds function automatically classifies content:
- **Trump-related**: Keyword detection, separated into "Quarantine Zone"
- **Sports-related**: Keyword detection, optionally filtered out
- **AI-related**: isAI flag, displayed in "Neural Feed" section

## Key Learnings
1. Netlify Functions require separate dev server from Vite
2. `VITE_` prefix required for environment variables to be included in client build
3. UK date locale is 'en-GB' not 'en-UK'
4. Gemini API free tier has rate limits that can be hit during testing
5. Supabase anonymous auth is great for quick prototyping
6. Open-Meteo API is free and requires no API key - great for weather widgets
7. RSS parsing requires careful handling of different feed formats and image sources
8. Time-based widget positioning (useState + setInterval) creates engaging dynamic UIs
9. Content filtering by keywords works well for basic categorisation
