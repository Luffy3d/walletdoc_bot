import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  
  // Default to dashboard, but respect the 'next' param if provided
  const next = searchParams.get('next') ?? '/dashboard'

  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )

  // 1. Check if a session already exists (Bot pre-click protection)
  const { data: { session } } = await supabase.auth.getSession()
  if (session) {
    return NextResponse.redirect(`${origin}${next}`)
  }

  // 2. Exchange the temporary code for a permanent session
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
    
    console.error("Auth Callback Error:", error.message)
  }

  // 3. SILENT RECOVERY: Instead of showing "invalid_link", 
  // try to send them to the dashboard anyway. 
  // If they truly aren't logged in, the middleware will catch them.
  return NextResponse.redirect(`${origin}/dashboard`)
}
