import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { connectToDatabase } from '@/lib/mongodb'
import { signToken } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Email et mot de passe requis' }, { status: 400 })
    }

    const { db } = await connectToDatabase()
    const user = await db.collection('users').findOne({ email: email.toLowerCase() })

    if (!user) {
      return NextResponse.json({ error: 'Identifiants incorrects' }, { status: 401 })
    }

    if (!user.is_active) {
      return NextResponse.json({ error: 'Compte désactivé' }, { status: 403 })
    }

    const passwordMatch = await bcrypt.compare(password, user.password)
    if (!passwordMatch) {
      return NextResponse.json({ error: 'Identifiants incorrects' }, { status: 401 })
    }

    const token = signToken({
      userId: user._id.toString(),
      orgId: user.org_id.toString(),
      role: user.role,
      nom: user.nom,
      prenom: user.prenom,
    })

    return NextResponse.json({
      token,
      user: {
        id: user._id.toString(),
        email: user.email,
        role: user.role,
        nom: user.nom,
        prenom: user.prenom,
      },
    })
  } catch (err) {
    console.error('Login error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
