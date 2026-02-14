import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Define arrays of public and protected paths
const PUBLIC_PATHS = ['/', '/login', '/signup', '/learn', '/about', '/terms', '/docs'];
const PROTECTED_PATHS = ['/budget', '/stats', '/account'];
const AUTH_PATHS = ['/login', '/signup'];

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const path = req.nextUrl.pathname;

  // For protected paths, always let requests through immediately.
  // Client-side ProtectedRoute handles auth using cached user data,
  // so there's zero loading delay for offline/Capacitor users.
  if (PROTECTED_PATHS.some(protectedPath => path.startsWith(protectedPath))) {
    return res;
  }

  // For auth pages (login/signup), try to check session to redirect
  // authenticated users away, but don't block if offline.
  if (AUTH_PATHS.includes(path)) {
    try {
      const supabase = createMiddlewareClient({ req, res });
      const result = await Promise.race([
        supabase.auth.getSession(),
        new Promise<null>(r => setTimeout(() => r(null), 1500)),
      ]);
      const session = result && 'data' in result ? result.data.session : null;
      if (session) {
        return NextResponse.redirect(new URL('/budget', req.url));
      }
    } catch {
      // Offline — let through, user will see login page
    }
  }

  return res;
}
