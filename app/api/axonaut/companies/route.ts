import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import { getUserAxonautKey, searchCompany } from '@/lib/axonaut'

export const GET = withAuth(async (req: NextRequest, user) => {
  try {
    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search')

    if (!search || search.length < 3) {
      return NextResponse.json([])
    }

    let apiKey: string
    try {
      apiKey = await getUserAxonautKey(user.userId)
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
