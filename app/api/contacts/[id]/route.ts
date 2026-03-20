import { NextRequest, NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { withAuth } from '@/lib/auth'
import { connectToDatabase } from '@/lib/mongodb'

export const GET = withAuth(async (_req: NextRequest, user, context) => {
  try {
    const id = context?.params?.id
    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'ID invalide' }, { status: 400 })
    }

    const { db } = await connectToDatabase()
    const contact = await db.collection('contacts').findOne({
      _id: new ObjectId(id),
      org_id: new ObjectId(user.orgId),
    })

    if (!contact) {
      return NextResponse.json({ error: 'Contact non trouvé' }, { status: 404 })
    }

    return NextResponse.json(contact)
  } catch (err) {
    console.error('Get contact error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
})

export const PUT = withAuth(async (req: NextRequest, user, context) => {
  try {
    const id = context?.params?.id
    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'ID invalide' }, { status: 400 })
    }

    const body = await req.json()
    const { db } = await connectToDatabase()

    // Build update fields
    const updateFields: Record<string, unknown> = { updated_at: new Date() }
    const allowedFields = [
      'prenom', 'nom', 'societe', 'poste', 'email', 'telephone',
      'telephone_2', 'adresse', 'site_web', 'linkedin', 'note',
    ]

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateFields[field] = body[field]
      }
    }

    // Handle tasks update
    if (body.tasks) {
      updateFields.tasks = body.tasks.map((t: Record<string, unknown>) => ({
        _id: t._id ? new ObjectId(t._id as string) : new ObjectId(),
        description: t.description || '',
        due_date: t.due_date ? new Date(t.due_date as string) : new Date(),
        type: t.type || 'autre',
        done: !!t.done,
        axonaut_task_id: t.axonaut_task_id || '',
      }))
    }

    const result = await db.collection('contacts').findOneAndUpdate(
      { _id: new ObjectId(id), org_id: new ObjectId(user.orgId) },
      { $set: updateFields },
      { returnDocument: 'after' }
    )

    if (!result) {
      return NextResponse.json({ error: 'Contact non trouvé' }, { status: 404 })
    }

    return NextResponse.json(result)
  } catch (err) {
    console.error('Update contact error:', err)
    return NextResponse.json({ error: 'Erreur lors de la mise à jour' }, { status: 500 })
  }
})

export const DELETE = withAuth(async (_req: NextRequest, user, context) => {
  try {
    const id = context?.params?.id
    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'ID invalide' }, { status: 400 })
    }

    const { db } = await connectToDatabase()
    const result = await db.collection('contacts').deleteOne({
      _id: new ObjectId(id),
      org_id: new ObjectId(user.orgId),
    })

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Contact non trouvé' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Delete contact error:', err)
    return NextResponse.json({ error: 'Erreur lors de la suppression' }, { status: 500 })
  }
})
