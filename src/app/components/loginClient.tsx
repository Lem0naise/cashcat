'use client';

import { createClient } from '@/app/utils/supabase';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function LoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Validate redirectTo parameter against security threats only
  const validateRedirectTo = (redirect: string | null): string => {
    if (!redirect) return '/budget';
    
    // Normalize the redirect URL for analysis (decode multiple times, normalize case)
    let normalizedRedirect = redirect.toLowerCase().trim();
    
    // Decode multiple times to handle double/triple encoding
    for (let i = 0; i < 5; i++) {
      try {
        const decoded = decodeURIComponent(normalizedRedirect);
        if (decoded === normalizedRedirect) break; // No more changes
        normalizedRedirect = decoded;
      } catch {
        return '/budget'; // Invalid encoding
      }
    }
    
    // Remove common obfuscation characters
    normalizedRedirect = normalizedRedirect
      .replace(/[\s\t\n\r\x00-\x1f]/g, '') // Remove whitespace and control chars
      .replace(/[\\\/]+/g, '/') // Normalize slashes
      .replace(/\x00/g, ''); // Remove null bytes
    
    // Check for dangerous protocols (comprehensive list)
    const dangerousProtocols = [
      'javascript:', 'data:', 'vbscript:', 'file:', 'ftp:', 'about:', 'chrome:',
      'livescript:', 'mocha:', 'tcl:', 'res:', 'resource:', 'chrome-extension:',
      'moz-extension:', 'ms-appx:', 'x-javascript:', 'ecmascript:'
    ];
    
    if (dangerousProtocols.some(protocol => normalizedRedirect.includes(protocol))) {
      return '/budget';
    }
    
    // Block external URLs more comprehensively
    if (normalizedRedirect.match(/^https?:\/\//) || 
        normalizedRedirect.match(/^\/\//) || 
        normalizedRedirect.includes('://')) {
      return '/budget';
    }
    
    // Only allow paths starting with / (no relative paths)
    if (!redirect.startsWith('/')) {
      return '/budget';
    }
    
    // Block suspicious patterns (more comprehensive)
    const suspiciousPatterns = [
      // Script tags and HTML
      '<script', '</script>', '<iframe', '<object', '<embed', '<form',
      // JavaScript events  
      'onload=', 'onerror=', 'onclick=', 'onmouseover=', 'onfocus=', 'onblur=',
      'onchange=', 'onsubmit=', 'onkeydown=', 'onkeyup=', 'onmousedown=',
      // JavaScript functions
      'eval(', 'alert(', 'confirm(', 'prompt(', 'settimeout(', 'setinterval(',
      // DOM manipulation
      'document.', 'window.', 'location.', 'history.', 'navigator.',
      // Encoded versions
      '&#', '\\u', '\\x', '%3c', '%3e', '%22', '%27',
      // Expression/execution
      'expression(', 'url(', 'import(', 'require(',
    ];
    
    if (suspiciousPatterns.some(pattern => normalizedRedirect.includes(pattern))) {
      return '/budget';
    }
    
    // Block directory traversal more thoroughly
    if (normalizedRedirect.includes('..') || 
        normalizedRedirect.includes('%2e%2e') ||
        normalizedRedirect.includes('\\') ||
        normalizedRedirect.match(/\.{2,}/)) {
      return '/budget';
    }
    
    // Additional safety: only allow alphanumeric, dash, underscore, slash, and query params
    if (!redirect.match(/^\/[a-zA-Z0-9\-_\/\?=&%]*$/)) {
      return '/budget';
    }
    
    // Length check to prevent extremely long URLs
    if (redirect.length > 500) {
      return '/budget';
    }
    
    return redirect;
  };
  
  const redirectTo = validateRedirectTo(searchParams.get('redirectTo'));
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
        <h1 className="text-2xl font-bold mb-8 text-center">Sign in to CashCat</h1>

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
          view="sign_in"
        />

        <div className="mt-3 text-center bg-blue-500/[.1] border border-blue-500/[.2] rounded-lg p-2">
          <span className="text-white/70 text-md">Don't have an account? </span>
          <Link href="/signup" className="text-green hover:underline text-md">
            Sign up here
          </Link>
        </div>

        <p className="text-xs font-400 text-white/70 text-center mt-4">
          If you are encountering problems signing in, please email lemonaise.dev@gmail.com
        </p>
      </div>
    </div>
  );
}