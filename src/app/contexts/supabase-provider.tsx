'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';
import { createClient } from '../utils/supabase';
import { useRouter } from 'next/navigation';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';

type SupabaseContext = {
  user: User | null;
  loading: boolean;
};

const Context = createContext<SupabaseContext>({
  user: null,
  loading: true,
});

const USER_CACHE_KEY = 'cashcat-user';

/**
 * Ensure a settings row exists for the user.
 * Uses INSERT ... ON CONFLICT DO NOTHING so it never overwrites existing data.
 * Called once per session after auth is confirmed.
 */
async function ensureSettingsRow(userId: string, supabase: ReturnType<typeof createClient>) {
  await supabase
    .from('settings')
    .upsert({ id: userId }, { onConflict: 'id', ignoreDuplicates: true });
}

export default function SupabaseProvider({
  children
}: {
  children: React.ReactNode
}) {
  // Try to load cached user synchronously for instant render
  const [user, setUser] = useState<User | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const cached = localStorage.getItem(USER_CACHE_KEY);
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });
  // If we have a cached user, start with loading=false so app renders immediately
  const [loading, setLoading] = useState(() => {
    if (typeof window === 'undefined') return true;
    try {
      return !localStorage.getItem(USER_CACHE_KEY);
    } catch {
      return true;
    }
  });
  const supabase = createClient();
  const queryClient = useQueryClient();
  const router = useRouter();

  useEffect(() => {
    // Background auth check — updates user if online, no-op if offline
    const getSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const u = session?.user ?? null;
        setUser(u);
        if (u) {
          localStorage.setItem(USER_CACHE_KEY, JSON.stringify(u));
          // Ensure the settings row exists so import/export counts always work
          ensureSettingsRow(u.id, supabase);
        } else {
          localStorage.removeItem(USER_CACHE_KEY);
        }
      } catch {
        // Offline — cached user is already loaded, nothing to do
      } finally {
        setLoading(false);
      }
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) {
        localStorage.setItem(USER_CACHE_KEY, JSON.stringify(u));
        // Ensure the settings row exists (handles new sign-ups and returning users)
        ensureSettingsRow(u.id, supabase);
      } else {
        localStorage.removeItem(USER_CACHE_KEY);
        // Clear all cached query data so a new user starts fresh
        if (event === 'SIGNED_OUT') {
          queryClient.clear();
        }
      }
      setLoading(false);
    });

    getSession();

    // On native Capacitor, handle the OAuth deep link redirect back into the app
    let appUrlOpenListener: Awaited<ReturnType<typeof App.addListener>> | null = null;

    if (Capacitor.isNativePlatform()) {
      App.addListener('appUrlOpen', async (event) => {
        const url = new URL(event.url);

        // PKCE flow: ?code= → navigate to /auth/callback which exchanges it server-side
        const code = url.searchParams.get('code');
        if (code) {
          const next = url.searchParams.get('next') ?? '/budget';
          router.push(`/auth/callback?code=${code}&next=${encodeURIComponent(next)}`);
          return;
        }

        // Implicit flow: #access_token=...&refresh_token=...
        const hash = url.hash;
        if (hash && hash.includes('access_token')) {
          const params = new URLSearchParams(hash.slice(1));
          const access_token = params.get('access_token');
          const refresh_token = params.get('refresh_token');
          if (access_token && refresh_token) {
            const { error } = await supabase.auth.setSession({ access_token, refresh_token });
            if (!error) {
              router.push('/budget');
            }
          }
        }
      }).then(listener => {
        appUrlOpenListener = listener;
      });
    }

    return () => {
      subscription.unsubscribe();
      appUrlOpenListener?.remove();
    };
  }, []);

  return (
    <Context.Provider value={{ user, loading }}>
      {children}
    </Context.Provider>
  );
}

export const useSupabase = () => {
  const context = useContext(Context);
  if (context === undefined) {
    throw new Error('useSupabase must be used within a SupabaseProvider');
  }
  return context;
};
