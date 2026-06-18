import { createClient } from '@supabase/supabase-js';

// Safe to keep in client-side source: this is the publishable/anon key,
// designed to be exposed in the browser. Access to data is enforced by
// Postgres row-level security policies on the `user_data` table, not by
// keeping this key secret.
const SUPABASE_URL = 'https://rnnncbzemskpggxvnndh.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_TMgP14zRi7XOnlFP-OSW2Q_1CMPogTe';

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
