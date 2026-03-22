import { NextRequest, NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import bcrypt from 'bcryptjs'
import { withAuth } from '@/lib/auth'
import { connectToDatabase } from '@/lib/mongodb'

export const GET = withAuth(async (_req: NextRequest, user) => {
  if (user.role !== 'admin') {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

  try {
    const { db } = await connectToDatabase()
    const users = await db
      .collection('users')
      .find({ org_id: new ObjectId(user.orgId) })
      .project({ password: 0 })
      .toArray()

    return NextResponse.json(users)
  } catch (err) {
    console.error('Get users error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
})

export const POST = withAuth(async (req: NextRequest, user) => {
  if (user.role !== 'admin') {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

  try {
    const { nom, prenom, email, password, role: requestedRole } = await req.json()

    if (!nom || !prenom || !email || !password) {
      return NextResponse.json({ error: 'Tous les champs sont requis' }, { status: 400 })
    }

    const role = requestedRole === 'admin' ? 'admin' : 'commercial'

    const { db } = await connectToDatabase()

    const existing = await db.collection('users').findOne({ email: email.toLowerCase() })
    if (existing) {
      return NextResponse.json({ error: 'Cet email est déjà utilisé' }, { status: 409 })
    }

    const hashedPassword = await bcrypt.hash(password, 12)

    const newUser = {
      org_id: new ObjectId(user.orgId),
      email: email.toLowerCase(),
      password: hashedPassword,
      role,
      nom,
      prenom,
      is_active: true,
      must_change_password: true,
      created_at: new Date(),
    }

    const result = await db.collection('users').insertOne(newUser)

    return NextResponse.json(
      {
        _id: result.insertedId,
        email: newUser.email,
        role: newUser.role,
        nom: newUser.nom,
        prenom: newUser.prenom,
        is_active: newUser.is_active,
      },
      { status: 201 }
    )
  } catch (err) {
    console.error('Create user error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
})
