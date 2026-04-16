import { NextRequest, NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { withAuth } from '@/lib/auth'
import { connectToDatabase } from '@/lib/mongodb'
import { getUserAxonautKey, getCompany, getEmployee } from '@/lib/axonaut'

export const dynamic = 'force-dynamic'

// Crée (ou retourne si déjà existant) un contact local "shell" attaché à une entité Axonaut.
// Body : { companyId?: number, employeeId?: number }
// L'un des deux est requis. Si employeeId fourni, on récupère aussi la company pour enrichir.
export const POST = withAuth(async (req: NextRequest, user) => {
  try {
    const body = await req.json()
    const { companyId, employeeId } = body as {
      companyId?: number | string
      employeeId?: number | string
    }

    if (!companyId && !employeeId) {
      return NextResponse.json({ error: 'companyId ou employeeId requis' }, { status: 400 })
    }

    const { db } = await connectToDatabase()

    let apiKey: string
    try {
      apiKey = await getUserAxonautKey(user.userId)
    } catch {
      return NextResponse.json(
        { error: 'Clé API Axonaut non configurée' },
        { status: 400 }
      )
    }

    // Résoudre company + employee depuis Axonaut
    let employee: any = null
    let resolvedCompanyId: number | null = companyId ? Number(companyId) : null

    if (employeeId) {
      try {
        employee = await getEmployee(Number(employeeId), apiKey)
        if (employee?.company_id) resolvedCompanyId = Number(employee.company_id)
      } catch (err) {
        return NextResponse.json(
          { error: err instanceof Error ? err.message : 'Employee introuvable' },
          { status: 500 }
        )
      }
    }

    if (!resolvedCompanyId) {
      return NextResponse.json({ error: 'Impossible de résoudre la company' }, { status: 400 })
    }

    let company: any
    try {
      company = await getCompany(resolvedCompanyId, apiKey)
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : 'Company introuvable' },
        { status: 500 }
      )
    }

    // Si déjà un contact local existe avec cette axonaut_company_id (optionnellement le même employee_id), on le retourne
    const existingQuery: Record<string, unknown> = {
      org_id: new ObjectId(user.orgId),
      axonaut_company_id: String(resolvedCompanyId),
    }
    if (user.role === 'commercial') existingQuery.scanned_by = new ObjectId(user.userId)
    if (employee?.id) existingQuery.axonaut_employee_id = String(employee.id)

    const existing = await db.collection('contacts').findOne(existingQuery)
    if (existing) {
      return NextResponse.json({ contact: existing, created: false })
    }

    // Créer un shell contact
    const shellContact = {
      org_id: new ObjectId(user.orgId),
      scanned_by: new ObjectId(user.userId),
      scanned_by_name: `${user.prenom} ${user.nom}`,
      prenom: employee?.firstname || '',
      nom: employee?.lastname || '',
      societe: company?.name || '',
      poste: employee?.job || '',
      email: employee?.email || '',
      telephone: employee?.phone_number || '',
      telephone_2: employee?.cellphone_number || '',
      adresse:
        [company?.address_street, company?.address_zip_code, company?.address_city]
          .filter(Boolean)
          .join(' ') || '',
      site_web: '',
      linkedin: '',
      note: '',
      source: 'manuel' as const,
      card_image_url: '',
      axonaut_company_id: String(resolvedCompanyId),
      axonaut_employee_id: employee?.id ? String(employee.id) : '',
      axonaut_synced: true,
      synced_at: new Date(),
      tasks: [],
      scanned_at: new Date(),
      updated_at: new Date(),
    }

    const result = await db.collection('contacts').insertOne(shellContact)
    return NextResponse.json({
      contact: { ...shellContact, _id: result.insertedId },
      created: true,
    })
  } catch (err) {
    console.error('Shell contact creation error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
})
