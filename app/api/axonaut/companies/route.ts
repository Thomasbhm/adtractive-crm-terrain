import { NextRequest, NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { withAuth } from '@/lib/auth'
import { connectToDatabase } from '@/lib/mongodb'
import { decrypt } from '@/lib/crypto'
import { searchCompany } from '@/lib/axonaut'

export const GET = withAuth(async (req: NextRequest, user) => {
  try {
    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search')

    if (!search || search.length < 3) {
      return NextResponse.json([])
    }

    const { db } = await connectToDatabase()
    const org = await db
      .collection('organizations')
      .findOne({ _id: new ObjectId(user.orgId) })

    if (!org?.axonaut_api_key) {
      return NextResponse.json([])
    }

    let apiKey: string
    try {
      apiKey = decrypt(org.axonaut_api_key)
    } catch {
      return NextResponse.json([])
    }

    const companies = await searchCompany(search, apiKey)
    return NextResponse.json(
      companies.map((c) => ({ id: c.id, name: c.name }))
    )
  } catch (err) {
    console.error('Axonaut companies search error:', err)
    return NextResponse.json([])
  }
})
