# Purpoise App - Development Context

## Project Overview
Purpoise is an AI-powered goal-setting and task management application that helps users break down their goals into structured, actionable plans. The name is a pun on "purpose" and "porpoise" - because every goal needs a purpose!

## Recent Development Work (November 2024)

### 1. Fixed Development Environment Setup
**Problem:** The AI chat functionality wasn't working because the development server wasn't properly configured.

**Solution:**
- Configured proper local development environment using Netlify CLI
- Set up concurrent running of Vite dev server (port 5173) and Netlify Functions server (port 9999)
- Updated [package.json](package.json) scripts:
  - `dev`: Runs both client and functions servers concurrently
  - `dev:client`: Runs Vite on port 5173
  - `dev:functions`: Runs Netlify functions on port 9999

**Files Modified:**
- [package.json](package.json): Updated dev scripts to use `concurrently`
- [client/vite.config.js](client/vite.config.js): Changed port from 3000 to 5173
- [netlify.toml](netlify.toml): Configured dev ports and framework settings
- [client/.env](client/.env): Updated API URL to point to local functions server

### 2. Updated Supabase Configuration
**Changes:**
- Migrated from old Supabase instance to new one
- Updated [client/.env](client/.env) with new Supabase URL and anon key
- URL: `https://qpmewfobfnbprlnfgayh.supabase.co`

### 3. Enhanced AI Chat Function
**Location:** [netlify/functions/chat.js](netlify/functions/chat.js)

**New Features:**

#### Context-Aware Goal Management
- AI now receives the user's existing goals as context
- Can both CREATE new goals and MODIFY existing ones
- Passes goals array to the chat API for intelligent suggestions

#### Current Date Awareness
- AI knows the current date in UK format (e.g., "Monday, 11 November 2024")
- Can calculate relative dates accurately ("next week", "in 2 weeks")
- Sets realistic task due dates based on current date

#### UK Localisation
- Uses British English spelling (organise, colour, favourite, etc.)
- Displays dates in UK format (DD/MM/YYYY or "11 November 2024")
- Locale set to 'en-GB'

#### Markdown Code Block Handling
- Strips markdown code blocks from AI responses (```json...```)
- Properly parses JSON even when wrapped in formatting

### 4. Frontend Goal Modification Features
**Location:** [client/src/App.jsx](client/src/App.jsx)

**New Capabilities:**

#### updateGoal Function
The AI can now modify existing goals with operations:
- **Update goal metadata**: Change title or description
- **Add tasks**: Insert new tasks to any stage
- **Remove tasks**: Delete specific tasks by index
- **Update tasks**: Modify task text, category, completion status, or due date

#### Enhanced Chat Modal
- Passes user's goals to chat API
- Handles both 'create' and 'update' actions from AI
- Context-aware greeting based on whether user has existing goals
- Supports backward compatibility for goals without explicit action types

## Architecture

### Tech Stack
- **Frontend**: React + Vite + Tailwind CSS
- **Backend**: Netlify Functions
- **Database**: Supabase (PostgreSQL)
- **AI**: Google Gemini 2.0 Flash (Experimental)

### Key Components
1. **Dashboard View**: Displays all goals with progress tracking
2. **Goal Detail View**: Shows stages and tasks for a specific goal
3. **Calendar View**: Visualises tasks by due date
4. **New Goal Modal**: AI-powered chat interface for creating/modifying goals

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
- Deploy to production Netlify site
- Add user authentication beyond anonymous users
- Implement goal sharing functionality
- Add AI-powered progress insights and recommendations
- Support for recurring tasks and habits tracking
- Mobile responsive improvements

## File Structure
```
purpoise-app/
├── client/                  # React frontend
│   ├── src/
│   │   ├── App.jsx         # Main application component
│   │   └── main.jsx        # Entry point
│   ├── .env                # Client environment variables
│   └── vite.config.js      # Vite configuration
├── netlify/
│   └── functions/
│       └── chat.js         # AI chat function
├── netlify.toml            # Netlify configuration
├── package.json            # Root package.json with scripts
└── CLAUDE.md              # This file
```

## Key Learnings
1. Netlify Functions require separate dev server from Vite
2. `VITE_` prefix required for environment variables to be included in client build
3. UK date locale is 'en-GB' not 'en-UK'
4. Gemini API free tier has rate limits that can be hit during testing
5. Supabase anonymous auth is great for quick prototyping
