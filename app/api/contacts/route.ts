import { NextRequest, NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { withAuth } from '@/lib/auth'
import { connectToDatabase } from '@/lib/mongodb'

export const POST = withAuth(async (req: NextRequest, user) => {
  try {
    const body = await req.json()

    const { db } = await connectToDatabase()

    const contact = {
      org_id: new ObjectId(user.orgId),
      scanned_by: new ObjectId(user.userId),
      scanned_by_name: `${user.prenom} ${user.nom}`,
      prenom: body.prenom || '',
      nom: body.nom || '',
      societe: body.societe || '',
      poste: body.poste || '',
      email: body.email || '',
      telephone: body.telephone || '',
      telephone_2: body.telephone_2 || '',
      adresse: body.adresse || '',
      site_web: body.site_web || '',
      linkedin: body.linkedin || '',
      note: body.note || '',
      source: body.source || 'manuel',
      card_image_url: body.card_image_url || '',
      axonaut_company_id: body.axonaut_company_id || '',
      axonaut_employee_id: '',
      axonaut_synced: false,
      tasks: (body.tasks || []).map((t: Record<string, unknown>) => ({
        _id: new ObjectId(),
        description: t.description || '',
        due_date: t.due_date ? new Date(t.due_date as string) : new Date(),
        type: t.type || 'autre',
        done: false,
        axonaut_task_id: '',
      })),
      scanned_at: new Date(),
      updated_at: new Date(),
    }

    const result = await db.collection('contacts').insertOne(contact)

    return NextResponse.json(
      { ...contact, _id: result.insertedId },
      { status: 201 }
    )
  } catch (err) {
    console.error('Create contact error:', err)
    return NextResponse.json({ error: 'Erreur lors de la création du contact' }, { status: 500 })
  }
})

export const GET = withAuth(async (req: NextRequest, user) => {
  try {
    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const skip = (page - 1) * limit

    const { db } = await connectToDatabase()

    const query: Record<string, unknown> = { org_id: new ObjectId(user.orgId) }

    // Commercial can only see their own contacts
    if (user.role === 'commercial') {
      query.scanned_by = new ObjectId(user.userId)
    }

    const [contacts, total] = await Promise.all([
      db.collection('contacts').find(query).sort({ scanned_at: -1 }).skip(skip).limit(limit).toArray(),
      db.collection('contacts').countDocuments(query),
    ])

    return NextResponse.json({
      contacts,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    })
  } catch (err) {
    console.error('Get contacts error:', err)
    return NextResponse.json({ error: 'Erreur lors de la récupération des contacts' }, { status: 500 })
  }
})
