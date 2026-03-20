import { NextRequest, NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { withAuth } from '@/lib/auth'
import { connectToDatabase } from '@/lib/mongodb'
import { encrypt } from '@/lib/crypto'

export const PUT = withAuth(async (req: NextRequest, user) => {
  if (user.role !== 'admin') {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

  try {
    const { openai_api_key, axonaut_api_key } = await req.json()
    const { db } = await connectToDatabase()

    const update: Record<string, string> = {}
    if (openai_api_key) update.openai_api_key = encrypt(openai_api_key)
    if (axonaut_api_key) update.axonaut_api_key = encrypt(axonaut_api_key)

    await db.collection('organizations').updateOne(
      { _id: new ObjectId(user.orgId) },
      { $set: update }
    )

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Update settings error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
})
