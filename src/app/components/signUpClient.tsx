'use client';

import { createClient } from '@/app/utils/supabase';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function SignUpClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirectTo') || '/budget';
  const supabase = createClient();
  const [redirectUrl, setRedirectUrl] = useState<string>('');

  useEffect(() => {
    setRedirectUrl(`${window.location.origin}${redirectTo}`);
  }, [redirectTo]);

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (session) {
        router.push(redirectTo);
      }
    };
    checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
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
        <h1 className="text-2xl font-bold mb-8 text-center">Sign up to CashCat</h1>

        

        <div className={`transition-opacity duration-200`}>
          <Auth 
            supabaseClient={supabase}
            localization={{
            variables: {
              sign_up : {
                link_text: ""
              },
              sign_in : {
                link_text: ""
              }
            }
          }}
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
                label: {
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
            onlyThirdPartyProviders={false}
            view="sign_up"
          />
        </div>

        {/* Terms agreement text */}
        <p className="text-xs text-white/70 text-center mb-4">
          By clicking Sign Up, I agree to CashCat's{' '}
          <a 
            href="/terms" 
            className="text-[#bac2ff] hover:underline"
            target="_blank"
          >
            Terms of Service and Privacy Policy
          </a>
        </p>

        <div className="mt-3 text-center bg-blue-500/[.1] border border-blue-500/[.2] rounded-lg p-2">
          <span className="text-white/70 text-md">Already have an account? </span>
          <Link href="/login" className="text-green hover:underline text-md">
            Sign in here
          </Link>
        </div>

        <p className="text-xs font-400 text-white/70 text-center mt-4">
          If you don't see your confirmation email, check your spam or junk folder. If you are encountering other problems creating an account, please email lemonaise.dev@gmail.com
        </p>
      </div>
    </div>
  );
}