import { NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'

export async function middleware(request) {
  // Skip middleware for static files and images
  if (
    request.nextUrl.pathname.startsWith('/_next') ||
    request.nextUrl.pathname.startsWith('/favicon.ico') ||
    request.nextUrl.pathname.startsWith('/api/auth') ||
    request.nextUrl.pathname.match(/\.(jpg|jpeg|png|gif|svg|ico|css|js)$/)
  ) {
    return NextResponse.next()
  }

  // Check for NextAuth session token
  const token = await getToken({ 
    req: request, 
    secret: process.env.NEXTAUTH_SECRET 
  })

  // Handle API routes that require authentication
  if (request.nextUrl.pathname.startsWith('/api/')) {
    // Skip auth routes
    if (request.nextUrl.pathname.startsWith('/api/auth/')) {
      return NextResponse.next()
    }

    // Skip health check and init routes
    if (
      request.nextUrl.pathname === '/api/health' ||
      request.nextUrl.pathname === '/api/init'
    ) {
      return NextResponse.next()
    }

    // Check for authorization header (legacy JWT) or NextAuth token
    const authHeader = request.headers.get('authorization')
    const hasLegacyToken = authHeader && authHeader.startsWith('Bearer ')
    
    if (!token && !hasLegacyToken) {
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      )
    }

    // Add user info to headers for API routes
    if (token) {
      const requestHeaders = new Headers(request.headers)
      requestHeaders.set('x-user-id', token.sub)
      requestHeaders.set('x-user-email', token.email)
      requestHeaders.set('x-user-username', token.username || '')

      return NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      })
    }
  }

  // Handle page routes
  const isAuthPage = ['/login', '/register', '/'].includes(request.nextUrl.pathname)
  const isProtectedPage = ['/dashboard', '/groups', '/activities', '/admin'].some(
    path => request.nextUrl.pathname.startsWith(path)
  )

  // Redirect authenticated users away from auth pages
  if (token && isAuthPage && request.nextUrl.pathname !== '/') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Redirect unauthenticated users to login
  if (!token && isProtectedPage) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('callbackUrl', request.nextUrl.pathname + request.nextUrl.search)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}