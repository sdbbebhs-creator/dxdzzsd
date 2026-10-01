import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL =
  (import.meta.env.VITE_SUPABASE_URL as string | undefined) ||
  'https://yewgrnoiprxtlogayaob.supabase.co';

const SUPABASE_ANON_KEY =
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ||
  'sb_publishable_4GAnDJJPNa7lHP-Vvq7-Gg_O-3BHJdy';

// Supabase stores the app data (vocab_items / grammar_items / study_data) and
// pushes changes to other devices through Realtime (see src/utils/supabaseItems.ts
// and src/hooks/useSupabaseRealtime.ts).
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  realtime: {
    params: { eventsPerSecond: 20 },
  },
});
