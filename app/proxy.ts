import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function proxy(req: NextRequest) {
  const session = await auth()
  const { pathname } = req.nextUrl

  // Public routes — allow unauthenticated
  if (pathname.startsWith('/login') || pathname.startsWith('/api/auth')) {
    // If already logged in, redirect away from login
    if (session && pathname.startsWith('/login')) {
      return NextResponse.redirect(new URL('/pos', req.url))
    }
    return NextResponse.next()
  }

  // API routes — withAuth() handles its own 401/403
  if (pathname.startsWith('/api/')) {
    return NextResponse.next()
  }

  // Protected dashboard routes — require session
  if (!session) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  // Role-based route protection
  const adminOnlyPaths = ['/products', '/inventory', '/reports']
  const isAdminOnly = adminOnlyPaths.some((p) => pathname.startsWith(p))

  if (isAdminOnly && session.user.role !== 'ADMIN') {
    return NextResponse.redirect(new URL('/pos', req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
