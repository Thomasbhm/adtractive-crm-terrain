import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import { getUserAxonautKey, getEmployee } from '@/lib/axonaut'

export const dynamic = 'force-dynamic'

export const GET = withAuth(async (req, user, ctx) => {
    const employeeId = Number(ctx?.params?.employeeId)
    if (!employeeId || Number.isNaN(employeeId)) {
      return NextResponse.json({ error: 'ID invalide' }, { status: 400 })
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

    try {
      const employee = await getEmployee(employeeId, apiKey)
      return NextResponse.json({ employee })
    } catch (err) {
      console.error('Axonaut employee fetch error:', err)
      const msg = err instanceof Error ? err.message : 'Erreur Axonaut'
      return NextResponse.json({ error: msg }, { status: 500 })
    }
  }
)
