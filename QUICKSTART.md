# Purpoise - Quick Start

Get Purpoise up and running in 5 minutes!

## 1. Install Dependencies (Already Done!)

```bash
npm install
cd client && npm install
cd ../netlify/functions && npm install
```

✅ Dependencies installed successfully!

## 2. Set Up Supabase

1. **Create a Supabase project**: https://supabase.com
2. **Copy your credentials** from Project Settings > API:
   - Project URL (looks like: `https://xxxxx.supabase.co`)
   - Anon/Public Key (starts with `eyJ...`)

3. **Run the database schema**:
   - Open SQL Editor in Supabase dashboard
   - Copy ALL contents from `supabase/schema.sql`
   - Paste and run it

4. **Enable Anonymous Auth**:
   - Go to Authentication > Providers
   - Toggle ON "Anonymous Sign-ins"

## 3. Get Gemini API Key

1. Visit: https://aistudio.google.com/app/apikey
2. Click "Create API Key"
3. Copy the key

## 4. Configure Environment Variables

### Create `.env` in project root:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key_here
GEMINI_API_KEY=your_gemini_api_key_here
```

### Create `client/.env`:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
VITE_API_URL=http://localhost:8888/.netlify/functions
```

## 5. Run the App

```bash
npm run dev
```

This starts:
- React app at **http://localhost:5173**
- API functions at **http://localhost:8888**

## 6. Try It Out!

1. Open http://localhost:5173 in your browser
2. Click "New Goal"
3. Chat with Purpoise to create your first goal!

## Troubleshooting

**"Cannot connect to Supabase"**
- Double-check your URLs and keys in `.env` files
- Make sure anonymous auth is enabled

**"AI chat not working"**
- Verify Gemini API key is valid
- Check the browser console for errors

**Need more help?**
See `SETUP.md` for detailed instructions.

## Next Steps

- Deploy to Netlify (see `SETUP.md`)
- Customize theme colors in `client/tailwind.config.js`
- Add your goals and start tracking progress!

---

🐬 **Happy goal setting with Purpoise!**
