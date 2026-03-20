import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import { connectToDatabase } from '@/lib/mongodb'
import { ObjectId } from 'mongodb'

export const GET = withAuth(async (_req: NextRequest, user) => {
  try {
    const { db } = await connectToDatabase()
    const dbUser = await db.collection('users').findOne({ _id: new ObjectId(user.userId) })

    if (!dbUser) {
      return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 })
    }

    // Check if org has API keys configured
    const org = await db.collection('organizations').findOne({ _id: dbUser.org_id })

    return NextResponse.json({
      id: dbUser._id.toString(),
      email: dbUser.email,
      role: dbUser.role,
      nom: dbUser.nom,
      prenom: dbUser.prenom,
      org_id: dbUser.org_id.toString(),
      org_has_openai_key: !!org?.openai_api_key,
      org_has_axonaut_key: !!org?.axonaut_api_key,
    })
  } catch (err) {
    console.error('Me error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
})
