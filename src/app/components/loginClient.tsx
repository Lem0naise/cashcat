'use client';

import { createClient } from '@/app/utils/supabase';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function Login() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirectTo') || '/budget';
  const supabase = createClient();
  const [redirectUrl, setRedirectUrl] = useState<string>('');

  useEffect(() => {
    // Set the redirect URL after component mounts (client-side only)
    setRedirectUrl(`${window.location.origin}${redirectTo}`);
  }, [redirectTo]);

  useEffect(() => {
    // Check initial session to redirect if already logged in
    const checkSession = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (session) {
        router.push(redirectTo);
      }
    };
    checkSession();

    // Setup auth state change listener for email login redirects
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        // Handle email login redirect
        if (session.user?.app_metadata.provider === 'email') {
          router.push(redirectTo);
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router, redirectTo, supabase]);

  return (
    <div className="min-h-screen bg-background font-[family-name:var(--font-suse)] flex items-center justify-center">
      <div className="w-full max-w-md p-8 bg-white/[.02] rounded-lg border-b-4">
        <h1 className="text-2xl font-bold mb-8 text-center">Sign in to CashCat</h1>
        <Auth 
          supabaseClient={supabase}
          appearance={{
            theme: ThemeSupa,
            variables: {
              default: {
                colors: {
                  brand: '#bac2ff',
                  brandAccent: '#bac2ff',
                  inputBackground: 'rgba(255, 255, 255, 0.05)',
                  inputText: '#ffffff',
                  inputBorder: 'rgba(255, 255, 255, 0.15)',
                }
              }
            },
            style: {
              button: {
                border: 'none',
                borderRadius: '8px',
                backgroundColor: '#bac2ff',
                color: '#000000',
                fontFamily: "Gabarito",
              },
              anchor: {
                color: '#bac2ff',
                fontFamily: "Gabarito",
              },
              label : {
                fontFamily: "Gabarito"
              },
              input: {
                borderRadius: '8px',
                fontFamily: "Gabarito",
              },
            },
          }}
          theme="dark"
          providers={[]}
          redirectTo={redirectUrl}
        />
      </div>
    </div>
  );
}
