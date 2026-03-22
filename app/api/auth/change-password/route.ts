import { NextRequest, NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import bcrypt from 'bcryptjs'
import { withAuth } from '@/lib/auth'
import { connectToDatabase } from '@/lib/mongodb'
import { signToken } from '@/lib/auth'

export const PUT = withAuth(async (req: NextRequest, user) => {
  try {
    const { new_password } = await req.json()

    if (!new_password || new_password.length < 6) {
      return NextResponse.json(
        { error: 'Le mot de passe doit contenir au moins 6 caractères' },
        { status: 400 }
      )
    }

    const { db } = await connectToDatabase()
    const hashedPassword = await bcrypt.hash(new_password, 12)

    await db.collection('users').updateOne(
      { _id: new ObjectId(user.userId) },
      {
        $set: {
          password: hashedPassword,
          must_change_password: false,
          updated_at: new Date(),
        },
      }
    )

    // Renvoyer un nouveau token (le user est maintenant "normal")
    const newToken = signToken({
      userId: user.userId,
      orgId: user.orgId,
      role: user.role,
      nom: user.nom,
      prenom: user.prenom,
    })

    return NextResponse.json({ token: newToken })
  } catch (err) {
    console.error('Change password error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
})
