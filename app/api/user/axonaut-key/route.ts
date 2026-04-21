import { NextRequest, NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { withAuth } from '@/lib/auth'
import { connectToDatabase } from '@/lib/mongodb'
import { encrypt, decrypt } from '@/lib/crypto'

export const dynamic = 'force-dynamic'

// GET — Récupère la clé API actuelle de l'utilisateur (déchiffrée)
// Retourne {apiKey, isSet} où apiKey est la clé en clair si présente, sinon chaîne vide
export const GET = withAuth(async (_req: NextRequest, user) => {
  try {
    const { db } = await connectToDatabase()
    const u = await db.collection('users').findOne({ _id: new ObjectId(user.userId) })
    if (!u) {
      return NextResponse.json({ apiKey: '', isSet: false })
    }

    let apiKey = ''
    try {
      if (u.axonaut_api_key) apiKey = decrypt(u.axonaut_api_key)
    } catch {
      // clé corrompue → on retourne vide
    }

    return NextResponse.json({
      apiKey,
      isSet: !!u.axonaut_api_key_set && !!apiKey,
    })
  } catch (err) {
    console.error('Get axonaut key error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
})

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
