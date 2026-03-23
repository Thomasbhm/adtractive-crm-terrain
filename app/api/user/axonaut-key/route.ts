import { NextRequest, NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { withAuth } from '@/lib/auth'
import { connectToDatabase } from '@/lib/mongodb'
import { encrypt } from '@/lib/crypto'

export const POST = withAuth(async (req: NextRequest, user) => {
  try {
    const { apiKey } = await req.json()

    if (!apiKey || apiKey.trim().length === 0) {
      return NextResponse.json({ error: 'Clé API requise' }, { status: 400 })
    }

    // Tester la clé via GET /api/v2/me
    const testRes = await fetch('https://axonaut.com/api/v2/me', {
      headers: { userApiKey: apiKey.trim() },
    })

    if (!testRes.ok) {
      return NextResponse.json(
        { error: 'Clé API invalide. Vérifiez que vous avez copié la bonne clé.' },
        { status: 400 }
      )
    }

    // Chiffrer et sauvegarder
    const { db } = await connectToDatabase()
    await db.collection('users').updateOne(
      { _id: new ObjectId(user.userId) },
      {
        $set: {
          axonaut_api_key: encrypt(apiKey.trim()),
          axonaut_api_key_set: true,
        },
      }
    )

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Set axonaut key error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
})
