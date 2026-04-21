import { NextRequest, NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { withAuth } from '@/lib/auth'
import { connectToDatabase } from '@/lib/mongodb'

export const dynamic = 'force-dynamic'

// Retourne le contact local associé à un axonaut_company_id (s'il existe)
export const GET = withAuth(async (_req, user, ctx) => {
    const companyId = ctx?.params?.companyId
    if (!companyId) {
      return NextResponse.json({ error: 'ID manquant' }, { status: 400 })
    }

    const { db } = await connectToDatabase()

    const query: Record<string, unknown> = {
      org_id: new ObjectId(user.orgId),
      axonaut_company_id: companyId,
    }
    if (user.role === 'commercial') {
      query.scanned_by = new ObjectId(user.userId)
    }

    const contact = await db.collection('contacts').findOne(query)
    return NextResponse.json({ contact: contact || null })
  }
)
