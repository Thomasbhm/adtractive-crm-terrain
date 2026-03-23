import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import { getUserAxonautKey, searchCompany, searchEmployees } from '@/lib/axonaut'

export const GET = withAuth(async (req: NextRequest, user) => {
  try {
    const { searchParams } = new URL(req.url)
    const query = searchParams.get('q')

    if (!query || query.length < 3) {
      return NextResponse.json({ companies: [], employees: [] })
    }

    let apiKey: string
    try {
      apiKey = await getUserAxonautKey(user.userId)
    } catch {
      return NextResponse.json(
        { error: 'Clé API Axonaut non configurée' },
        { status: 400 }
      )
    }

    // Appels parallèles
    const [companies, employees] = await Promise.all([
      searchCompany(query, apiKey).catch(() => []),
      searchEmployees(query, apiKey).catch(() => []),
    ])

    return NextResponse.json({
      companies: companies.slice(0, 5).map((c) => ({
        id: c.id,
        name: c.name,
        is_prospect: c.is_prospect,
        is_customer: c.is_customer,
      })),
      employees: employees.slice(0, 5).map((e) => ({
        id: e.id,
        firstname: e.firstname,
        lastname: e.lastname,
        email: e.email,
        company_id: e.company_id,
      })),
    })
  } catch (err) {
    console.error('Axonaut search error:', err)
    return NextResponse.json(
      { error: 'Impossible de contacter Axonaut. Vérifiez votre connexion.' },
      { status: 500 }
    )
  }
})
