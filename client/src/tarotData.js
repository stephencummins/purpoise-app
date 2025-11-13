import { createClient } from '@supabase/supabase-js';

// Get or create Sidhe Supabase client for tarot cards
function getSidheSupabase() {
  const url = import.meta.env.VITE_SIDHE_SUPABASE_URL;
  const key = import.meta.env.VITE_SIDHE_SUPABASE_ANON_KEY;

  if (!url || !key) {
    console.error('Sidhe Supabase credentials not configured');
    return null;
  }

  return createClient(url, key);
}

// Get daily cards using deterministic seed based on date
export async function getDailyCards() {
  try {
    const sidheSupabase = getSidheSupabase();

    if (!sidheSupabase) {
      console.error('Cannot fetch tarot cards: Sidhe database not configured');
      return [];
    }

    const today = new Date().toISOString().split('T')[0];
    const seed = hashDate(today);

    // Fetch all cards from Sidhe Supabase
    const { data: allCards, error } = await sidheSupabase
      .from('tarot_cards')
      .select('*')
      .order('id');

    if (error) throw error;

    if (!allCards || allCards.length === 0) {
      console.error('No cards found in Sidhe database');
      return [];
    }

    // Select 3 cards deterministically based on date
    return selectDailyCards(allCards, seed, 3);
  } catch (error) {
    console.error('Error fetching daily tarot cards:', error);
    return [];
  }
}

function hashDate(dateStr) {
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    const char = dateStr.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

function seededRandom(seed) {
  const x = Math.sin(seed++) * 10000;
  return x - Math.floor(x);
}

function selectDailyCards(cards, seed, count) {
  const shuffled = [...cards];
  let currentSeed = seed;

  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(seededRandom(currentSeed++) * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled.slice(0, count);
}
