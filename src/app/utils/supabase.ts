import { createClient as createSupabaseClient, SupabaseClient } from '@supabase/supabase-js';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Database } from '@/types/supabase';
import { Capacitor } from '@capacitor/core';

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_URL');
}
if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_ANON_KEY');
}

export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
export const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let client: SupabaseClient<Database> | null = null;

export const createClient = (): SupabaseClient<Database> => {
  if (!client) {
    if (typeof window !== 'undefined' && Capacitor.isNativePlatform()) {
      // Capacitor: use supabase-js directly (localStorage, works under capacitor:// scheme)
      client = createSupabaseClient<Database>(supabaseUrl, supabaseAnonKey);
    } else {
      // Web: use auth-helpers (cookie-based, works with Next.js middleware/SSR)
      client = createClientComponentClient<Database>({
        supabaseUrl,
        supabaseKey: supabaseAnonKey,
      }) as unknown as SupabaseClient<Database>;
    }
  }
  return client;
};
