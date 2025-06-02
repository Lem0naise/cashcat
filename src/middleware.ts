import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Define arrays of public and protected paths
const PUBLIC_PATHS = ['/', '/login', '/signup', '/learn', '/about'];
const PROTECTED_PATHS = ['/budget', '/stats', '/account'];
const AUTH_PATHS = ['/login', '/signup'];

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const path = req.nextUrl.pathname;

  // Check if the path is protected and there's no session
  if (!session && PROTECTED_PATHS.some(protectedPath => path.startsWith(protectedPath))) {
    // Store the attempted URL to redirect back after login
    const redirectUrl = new URL('/login', req.url);
    redirectUrl.searchParams.set('redirectTo', path);
    return NextResponse.redirect(redirectUrl);
  }

  // Redirect authenticated users away from auth pages
  if (session && AUTH_PATHS.includes(path)) {
    return NextResponse.redirect(new URL('/budget', req.url));
  }

  return res;
}
