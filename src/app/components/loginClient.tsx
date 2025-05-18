'use client';

import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { createClient } from '@/app/utils/supabase';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { isDevelopment } from '../utils/mocks';

export default function Login() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirectTo') || '/budget';
   
  const supabase = createClient();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (isDevelopment){
      router.push('/budget');
    }
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        router.push(redirectTo);
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
          redirectTo={`${window.location.origin}${redirectTo}`}
        />
      </div>
    </div>
  );
  // providers={['google']}
}
