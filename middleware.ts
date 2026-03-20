import { NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Protected routes - check for token in cookie or let client-side handle it
  // Since we use localStorage for JWT (client-side), middleware redirects
  // are handled client-side. This middleware adds security headers.

  const response = NextResponse.next()

  // Security headers
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'origin-when-cross-origin')

  // For API routes, ensure JSON content type errors are handled
  if (pathname.startsWith('/api/') && !pathname.startsWith('/api/auth/login')) {
    const authHeader = request.headers.get('authorization')
    if (!authHeader && !pathname.startsWith('/api/auth/login')) {
      // Let the API route handler deal with auth - it has more context
    }
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icon-.*\\.png|manifest\\.json).*)',
  ],
}
