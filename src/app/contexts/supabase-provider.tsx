'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/auth-helpers-nextjs';
import { Capacitor, registerPlugin } from '@capacitor/core';
import { createClient } from '../utils/supabase';
import { supabaseUrl, supabaseAnonKey } from '../utils/supabase';

interface AuthBridgePlugin {
  syncSession(options: {
    accessToken: string;
    refreshToken: string;
    expiresAt: number;
    userId: string;
    supabaseUrl: string;
    supabaseAnonKey: string;
  }): Promise<void>;
  clearSession(): Promise<void>;
}

const AuthBridge = Capacitor.isNativePlatform()
  ? registerPlugin<AuthBridgePlugin>('AuthBridge')
  : null;

type SupabaseContext = {
  user: User | null;
  loading: boolean;
};

const Context = createContext<SupabaseContext>({
  user: null,
  loading: true,
});

const USER_CACHE_KEY = 'cashcat-user';

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

  useEffect(() => {
    const syncToNative = (session: { access_token: string; refresh_token: string; expires_at?: number; user: { id: string } } | null) => {
      if (!AuthBridge) return;
      if (session) {
        AuthBridge.syncSession({
          accessToken: session.access_token,
          refreshToken: session.refresh_token,
          expiresAt: session.expires_at ?? 0,
          userId: session.user.id,
          supabaseUrl,
          supabaseAnonKey,
        }).catch(() => {});
      } else {
        AuthBridge.clearSession().catch(() => {});
      }
    };

    // Background auth check — updates user if online, no-op if offline
    const getSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const u = session?.user ?? null;
        setUser(u);
        if (u) {
          localStorage.setItem(USER_CACHE_KEY, JSON.stringify(u));
        } else {
          localStorage.removeItem(USER_CACHE_KEY);
        }
        syncToNative(session);
      } catch {
        // Offline — cached user is already loaded, nothing to do
      } finally {
        setLoading(false);
      }
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) {
        localStorage.setItem(USER_CACHE_KEY, JSON.stringify(u));
      } else {
        localStorage.removeItem(USER_CACHE_KEY);
      }
      syncToNative(session);
      setLoading(false);
    });

    getSession();

    return () => {
      subscription.unsubscribe();
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
