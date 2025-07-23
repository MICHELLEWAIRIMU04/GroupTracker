import { NextResponse } from 'next/server'
import { verifyToken } from './auth'

export function middleware(request) {
  // Check if this is an API route that requires authentication
  if (request.nextUrl.pathname.startsWith('/api/')) {
    // Skip auth routes
    if (request.nextUrl.pathname.startsWith('/api/auth/')) {
      return NextResponse.next()
    }

    // Get token from Authorization header
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    
    if (!token) {
      return NextResponse.json(
        { message: 'No token provided' },
        { status: 401 }
      )
    }

    const decoded = verifyToken(token)
    if (!decoded) {
      return NextResponse.json(
        { message: 'Invalid token' },
        { status: 401 }
      )
    }

    // Add user info to headers for API routes
    const requestHeaders = new Headers(request.headers)
    requestHeaders.set('x-user-id', decoded.userId)
    requestHeaders.set('x-user-admin', decoded.isAdmin.toString())

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    })
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/api/:path*'
  ]
}