import jwt from 'jsonwebtoken'
import { NextRequest, NextResponse } from 'next/server'

const JWT_SECRET = process.env.JWT_SECRET!

export interface JWTPayload {
  userId: string
  orgId: string
  role: 'admin' | 'commercial'
  nom: string
  prenom: string
}

export function signToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' })
}

export function verifyToken(token: string): JWTPayload {
  return jwt.verify(token, JWT_SECRET) as JWTPayload
}

export function getTokenFromRequest(req: NextRequest): string | null {
  const authHeader = req.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7)
  }
  return null
}

type AuthenticatedHandler = (
  req: NextRequest,
  user: JWTPayload,
  context?: { params: Record<string, string> }
) => Promise<NextResponse>

export function withAuth(handler: AuthenticatedHandler) {
  return async (req: NextRequest, context?: { params: Record<string, string> }) => {
    const token = getTokenFromRequest(req)

    if (!token) {
      return NextResponse.json(
        { error: 'Token d\'authentification manquant' },
        { status: 401 }
      )
    }

    try {
      const user = verifyToken(token)
      return handler(req, user, context)
    } catch {
      return NextResponse.json(
        { error: 'Token invalide ou expiré' },
        { status: 401 }
      )
    }
  }
}
