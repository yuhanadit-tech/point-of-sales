import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import type { NextRequest } from 'next/server'
import type { NextResponse } from 'next/server'
import type { UserRole } from '@prisma/client'

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials)
        if (!parsed.success) return null

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email },
        })

        if (!user || !user.isActive) return null

        const passwordMatch = await bcrypt.compare(
          parsed.data.password,
          user.passwordHash,
        )

        if (!passwordMatch) return null

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        }
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = (user as { role: UserRole }).role
      }
      return token
    },
    session({ session, token }) {
      if (token) {
        session.user.id = token.id as string
        session.user.role = token.role as UserRole
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 8 * 60 * 60, // 8 hours
  },
})

// ─── Extended request type ────────────────────────────────────────────────────

export interface NextRequestWithUser extends NextRequest {
  user: {
    id: string
    email: string
    name: string
    role: UserRole
  }
}

type RouteHandler = (
  req: NextRequestWithUser,
  context?: { params: Promise<Record<string, string>> },
) => Promise<NextResponse>

interface WithAuthOptions {
  roles?: UserRole[]
}

// ─── withAuth middleware ──────────────────────────────────────────────────────
// Usage: export const GET = withAuth(handler)
// Usage: export const POST = withAuth(handler, { roles: ['ADMIN'] })

export function withAuth(handler: RouteHandler, options: WithAuthOptions = {}) {
  return async (
    req: NextRequest,
    context?: { params: Promise<Record<string, string>> },
  ): Promise<NextResponse> => {
    const { NextResponse } = await import('next/server')

    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (options.roles && !options.roles.includes(session.user.role as UserRole)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const augmentedReq = req as NextRequestWithUser
    augmentedReq.user = {
      id: session.user.id,
      email: session.user.email ?? '',
      name: session.user.name ?? '',
      role: session.user.role as UserRole,
    }

    return handler(augmentedReq, context)
  }
}
