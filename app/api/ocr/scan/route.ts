import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { withAuth } from '@/lib/auth'
import { uploadImage } from '@/lib/minio'
import { getOpenAIClient, extractCardData } from '@/lib/openai'
import { connectToDatabase } from '@/lib/mongodb'
import { ObjectId } from 'mongodb'
import { decrypt } from '@/lib/crypto'

export const POST = withAuth(async (req: NextRequest, user) => {
  try {
    const formData = await req.formData()
    const file = formData.get('image') as File

    if (!file) {
      return NextResponse.json({ error: 'Image requise' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const mimeType = file.type || 'image/jpeg'

    // Upload to MinIO first (unique filename)
    const fileName = `cards/${Date.now()}-${randomUUID()}.jpg`
    const imageUrl = await uploadImage(buffer, fileName, mimeType)

    // Get org's OpenAI key or fallback to env
    const { db } = await connectToDatabase()
    const org = await db.collection('organizations').findOne({ _id: new ObjectId(user.orgId) })
    let apiKey: string | undefined
    if (org?.openai_api_key) {
      try {
        apiKey = decrypt(org.openai_api_key)
      } catch {
        // fallback to env key
      }
    }

    const openai = getOpenAIClient(apiKey)
    const base64 = buffer.toString('base64')

    const result = await extractCardData(openai, base64, mimeType)

    return NextResponse.json({
      contacts: result.contacts,
      image_url: imageUrl,
    })
  } catch (err) {
    console.error('OCR scan error:', err)
    const message = err instanceof Error ? err.message : 'Erreur lors de l\'analyse'
    if (message.includes('analyser la carte')) {
      return NextResponse.json({ error: message }, { status: 422 })
    }
    return NextResponse.json({ error: message }, { status: 500 })
  }
})
