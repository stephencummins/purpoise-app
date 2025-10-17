# Purpoise Project Summary

## 📋 Project Overview

**Purpoise** is a conversational AI-powered goal-setting and task management application. It uses an intelligent assistant to help users break down large goals into structured, staged plans with categorized tasks.

## 🏗️ Architecture

```
┌─────────────────┐
│   React App     │  ← Frontend (Vite + React 18 + Tailwind)
│  (Port 5173)    │
└────────┬────────┘
         │
         │ HTTP Requests
         ↓
┌─────────────────┐
│ Netlify         │  ← Serverless Functions
│ Functions       │     • Chat with Gemini AI
│ (Port 8888)     │     • CORS enabled
└────────┬────────┘
         │
         │ API Calls
         ↓
┌─────────────────┐
│ Google Gemini   │  ← AI Model (gemini-2.0-flash-exp)
│ API             │     • Natural language understanding
└─────────────────┘     • Structured plan generation

         ↕
┌─────────────────┐
│   Supabase      │  ← Database & Auth
│  (PostgreSQL)   │     • Goals, Stages, Tasks
└─────────────────┘     • Anonymous auth
                        • Row Level Security
```

## 📁 Project Structure

```
purpoise-app/
├── 📄 README.md                    # Project overview
├── 📄 SETUP.md                     # Detailed setup guide
├── 📄 QUICKSTART.md                # 5-minute quick start
├── 📄 FEATURES.md                  # Complete feature list
├── 📄 PROJECT_SUMMARY.md           # This file
├── 📄 package.json                 # Root dependencies
├── 📄 netlify.toml                 # Netlify config
├── 📄 .env.example                 # Environment template
│
├── 📁 client/                      # React Frontend
│   ├── 📄 package.json             # Client dependencies
│   ├── 📄 tailwind.config.js       # Tailwind theme config
│   ├── 📄 postcss.config.js        # PostCSS config
│   ├── 📄 vite.config.js           # Vite bundler config
│   ├── 📄 .env.example             # Client env template
│   └── 📁 src/
│       ├── 📄 App.jsx              # ⭐ Main app (878 lines)
│       ├── 📄 main.jsx             # React entry point
│       └── 📄 index.css            # Tailwind imports
│
├── 📁 netlify/functions/           # Serverless API
│   ├── 📄 chat.js                  # AI chat endpoint
│   └── 📄 package.json             # Functions dependencies
│
└── 📁 supabase/                    # Database
    └── 📄 schema.sql               # PostgreSQL schema
```

## 🎨 Design Philosophy

**Theme**: 1940s UK Rail Travel Posters
- Nostalgic, trustworthy, and inspiring
- Encourages forward movement and progress
- Vintage aesthetic with modern functionality

**Colors**:
- **Cream** (#FDFCEC) - Soft, paper-like background
- **Orange** (#F97316) - Warm, energetic accents
- **Brown** (#3D2C21) - Rich, readable text

**Typography**:
- **Serif** (Georgia) - Classic, authoritative headings
- **Sans-serif** (System fonts) - Clean, modern UI text

## 🔑 Key Features

### 1. AI-Powered Goal Creation
Users chat with "Purpoise" assistant who asks clarifying questions and generates a structured plan automatically.

### 2. Progress Tracking
Visual progress bars, task completion stats, and RAG (Red/Amber/Green) status indicators.

### 3. Habit Streaks
Special tracking for habit-type tasks with streak counters and visual feedback.

### 4. Calendar View
Monthly calendar showing all tasks with due dates, color-coded by category.

### 5. Weekly Digest
Contextual weekly summaries showing upcoming tasks or completed work.

## 🛠️ Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | React 18 | UI components & state |
| **Styling** | Tailwind CSS | Utility-first styling |
| **Backend** | Netlify Functions | Serverless API |
| **AI** | Google Gemini 2.0 | Natural language processing |
| **Database** | Supabase (PostgreSQL) | Data persistence |
| **Auth** | Supabase Auth | Anonymous authentication |
| **Icons** | Lucide React | Beautiful icon set |
| **HTTP** | Axios | API requests |
| **Build** | Vite | Fast dev & build tool |

## 📊 Database Schema

```sql
┌─────────────┐
│   users     │  (Supabase Auth)
│   (auth)    │
└──────┬──────┘
       │
       │ 1:N
       ↓
┌─────────────┐
│    goals    │  • title, description
│             │  • rag_status (red/amber/green)
└──────┬──────┘  • user_id (FK)
       │
       │ 1:N
       ↓
┌─────────────┐
│   stages    │  • name, order_index
│             │  • goal_id (FK)
└──────┬──────┘
       │
       │ 1:N
       ↓
┌─────────────┐
│    tasks    │  • text, category
│             │  • completed, due_date
│             │  • streak, last_completed_date
└─────────────┘  • stage_id (FK)
```

## 🚀 Deployment Options

### Option 1: Netlify (Recommended)
- Automatic CI/CD from Git
- Built-in serverless functions
- Free tier available
- Custom domains

### Option 2: Local Development
- Hot reload with Vite
- Local serverless functions
- Full debugging capabilities

## 🎯 User Flow

```
1. User opens app
   ↓
2. Anonymous auth (automatic)
   ↓
3. Dashboard loads (shows goals or empty state)
   ↓
4. User clicks "New Goal"
   ↓
5. Chat modal opens → Purpoise asks questions
   ↓
6. After 2-3 questions → Gemini generates plan
   ↓
7. Plan saved to Supabase → Auto-returns to dashboard
   ↓
8. User clicks goal → Detail view with stages/tasks
   ↓
9. User checks off tasks → Progress updates in real-time
   ↓
10. Calendar view → See all tasks with due dates
```

## 📈 Code Statistics

- **Total Files**: 20+ files
- **Main App**: 878 lines (single file!)
- **Languages**: JavaScript/JSX, SQL, TOML, Markdown
- **Dependencies**: ~30 packages (client + functions)
- **Components**: 5 main components (App, Dashboard, GoalDetail, Calendar, NewGoalModal)

## 🔒 Security Features

- Row Level Security (RLS) policies in Supabase
- User-scoped data access
- CORS protection
- Environment variable protection
- No sensitive data in frontend code
- Anonymous auth (no personal data collection)

## 🎓 Learning Resources

- **React**: https://react.dev
- **Tailwind CSS**: https://tailwindcss.com
- **Supabase**: https://supabase.com/docs
- **Netlify**: https://docs.netlify.com
- **Gemini API**: https://ai.google.dev/docs

## 📝 Environment Variables Required

### Root `.env`
```
SUPABASE_URL
SUPABASE_ANON_KEY
GEMINI_API_KEY
```

### Client `.env`
```
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
VITE_API_URL
```

## ✅ Current Status

**Status**: ✅ **COMPLETE & READY TO USE**

All core features implemented:
- ✅ AI goal creation
- ✅ Dashboard with progress tracking
- ✅ Goal detail view
- ✅ Calendar view
- ✅ Habit streaks
- ✅ Weekly digest
- ✅ Vintage theme
- ✅ Responsive design
- ✅ Database schema
- ✅ Serverless functions
- ✅ Documentation

**Next Steps for User**:
1. Set up Supabase account
2. Get Gemini API key
3. Configure environment variables
4. Run `npm run dev`
5. Start creating goals!

## 🤝 Contributing

This is a complete, production-ready application. Potential enhancements:
- Add email notifications
- Implement sharing functionality
- Create goal templates
- Add dark mode
- Build mobile app version

## 📞 Support

For setup help, see:
- `QUICKSTART.md` for fast setup
- `SETUP.md` for detailed instructions
- `FEATURES.md` for feature list

---

**Built with ❤️ and 🐬 by the Purpoise team**

Last Updated: October 2025
Version: 1.0.0
