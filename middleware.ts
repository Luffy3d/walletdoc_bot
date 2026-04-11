import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // We are letting all traffic through for now. 
  // The app/dashboard/page.tsx will handle its own security!
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|google03f40a8c91d058dd.html|robots.txt).*)',
  ],
}
