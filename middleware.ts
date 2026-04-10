import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // 1. Create the initial response
  let supabaseResponse = NextResponse.next({
    request,
  })

  // 2. Initialize Supabase with proper cookie handling
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // 3. Get the user (this also refreshes the session if needed)
  const { data: { user } } = await supabase.auth.getUser()
  const path = request.nextUrl.pathname
  const redirectWithSupabaseCookies = (url: URL) => {
    const response = NextResponse.redirect(url)

    supabaseResponse.cookies.getAll().forEach((cookie) => {
      response.cookies.set(cookie)
    })

    return response
  }

  // 🚨 RECTIFIED LOGIC:
  // If no user and trying to access dashboard, redirect to login
  if (path.startsWith('/dashboard') && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return redirectWithSupabaseCookies(url)
  }

  // If user is logged in and tries to hit /login, send them to dashboard
  if (path.startsWith('/login') && user) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return redirectWithSupabaseCookies(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (Telegram bot)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - Verification files
     * - Auth callback (Critical: Auth shouldn't be blocked by middleware)
     */
    '/((?!api|auth|_next/static|_next/image|favicon.ico|google03f40a8c91d058dd.html|robots.txt|admin).*)',
  ],
}
