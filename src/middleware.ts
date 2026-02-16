import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Define arrays of public and protected paths
const PROTECTED_PATHS = ['/budget', '/stats', '/account']
const AUTH_PATHS = ['/login', '/signup']

export async function middleware(request: NextRequest) {
  // 1. Create an initial response that we can attach cookies to
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // This represents the session update.
          // We need to update BOTH the request and the response
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const path = request.nextUrl.pathname

  // 2. Refresh session if needed (crucial for keeping users logged in)
  // This call updates the cookies in the background if the token is close to expiring
  const { data: { user } } = await supabase.auth.getUser()

  // 3. User Logic: Skip server-side checks for protected paths (relying on client cache)
  if (PROTECTED_PATHS.some(protectedPath => path.startsWith(protectedPath))) {
    return response
  }

  // 4. User Logic: Redirect logged-in users away from auth pages
  if (AUTH_PATHS.includes(path)) {
    if (user) {
      return NextResponse.redirect(new URL('/budget', request.url))
    }
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}