import { NextRequest, NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { withAuth } from '@/lib/auth'
import { connectToDatabase } from '@/lib/mongodb'

export const dynamic = 'force-dynamic'

// PATCH — toggle / set done flag for a single task inside a contact's tasks[]
export const PATCH = withAuth(async (req, user, ctx) => {
  try {
    const contactId = ctx?.params?.id
    const taskId = ctx?.params?.taskId
    if (!contactId || !taskId || !ObjectId.isValid(contactId) || !ObjectId.isValid(taskId)) {
      return NextResponse.json({ error: 'ID invalide' }, { status: 400 })
    }

    const body = await req.json().catch(() => ({}))
    const { done } = body as { done?: boolean }

    if (typeof done !== 'boolean') {
      return NextResponse.json({ error: 'done requis (boolean)' }, { status: 400 })
    }

    const { db } = await connectToDatabase()
    const result = await db.collection('contacts').updateOne(
      {
        _id: new ObjectId(contactId),
        org_id: new ObjectId(user.orgId),
        'tasks._id': new ObjectId(taskId),
      },
      { $set: { 'tasks.$.done': done, updated_at: new Date() } }
    )

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: 'Tâche non trouvée' }, { status: 404 })
    }

    return NextResponse.json({ success: true, done })
  } catch (err) {
    console.error('Toggle task error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
})
