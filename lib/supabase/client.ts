import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  // This explicitly tells Supabase to use Cookies so the server can see you!
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
