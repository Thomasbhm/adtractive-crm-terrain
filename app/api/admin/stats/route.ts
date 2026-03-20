import { NextRequest, NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { withAuth } from '@/lib/auth'
import { connectToDatabase } from '@/lib/mongodb'

export const GET = withAuth(async (_req: NextRequest, user) => {
  if (user.role !== 'admin') {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

  try {
    const { db } = await connectToDatabase()
    const orgId = new ObjectId(user.orgId)

    // Contacts scannés ce mois
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const contactsThisMonth = await db.collection('contacts').countDocuments({
      org_id: orgId,
      scanned_at: { $gte: startOfMonth },
    })

    // Contacts par commercial
    const contactsByUser = await db
      .collection('contacts')
      .aggregate([
        { $match: { org_id: orgId } },
        {
          $group: {
            _id: '$scanned_by',
            name: { $first: '$scanned_by_name' },
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
      ])
      .toArray()

    return NextResponse.json({
      contacts_this_month: contactsThisMonth,
      contacts_by_user: contactsByUser,
    })
  } catch (err) {
    console.error('Stats error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
})
