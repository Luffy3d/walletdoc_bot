import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
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

  const { data: { user } } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname

  // 🚨 THE FIX: ONLY protect the dashboard folder! 🚨
  // Let everyone see the homepage (/), the login page (/login), and allow the API to work.
  if (path.startsWith('/dashboard') && !user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // If a logged-in user tries to go to the login page, push them to the dashboard
  if (path.startsWith('/login') && user) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * 1. Ignore all API routes (important for your Telegram bot!)
     * - Ignore static files (_next/static)
     * - Ignore images (_next/image)
     * - Ignore verification files
     */
    '/((?!api|_next/static|_next/image|favicon.ico|google03f40a8c91d058dd.html|robots.txt).*)',
  ],
}
