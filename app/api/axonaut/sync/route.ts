import { NextRequest, NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { withAuth } from '@/lib/auth'
import { connectToDatabase } from '@/lib/mongodb'
import {
  getUserAxonautKey,
  searchCompany,
  createCompany,
  createEmployee,
  updateEmployee,
  createNote,
  createTask,
  syncUpdatesToAxonaut,
  toAxonautRFC3339,
} from '@/lib/axonaut'

function formatDateDDMMYYYY(date: Date): string {
  const d = date.getDate().toString().padStart(2, '0')
  const m = (date.getMonth() + 1).toString().padStart(2, '0')
  const y = date.getFullYear()
  return `${d}/${m}/${y}`
}

export const POST = withAuth(async (req: NextRequest, user) => {
  try {
    const body = await req.json()
    const { contactId, noteOnly, noteContent, tasksOnly, newTasks } = body

    if (!contactId || !ObjectId.isValid(contactId)) {
      return NextResponse.json({ error: 'ID contact invalide' }, { status: 400 })
    }

    const { db } = await connectToDatabase()

    // Récupérer le contact
    const contact = await db.collection('contacts').findOne({
      _id: new ObjectId(contactId),
      org_id: new ObjectId(user.orgId),
    })

    if (!contact) {
      return NextResponse.json({ error: 'Contact non trouvé' }, { status: 404 })
    }

    // Récupérer la clé API Axonaut de l'utilisateur
    let apiKey: string
    try {
      apiKey = await getUserAxonautKey(user.userId)
    } catch {
      return NextResponse.json(
        { error: 'Clé API Axonaut non configurée. Configurez-la dans votre profil.' },
        { status: 400 }
      )
    }

    // --- Cas B : Contact déjà synchronisé — sync uniquement les updates ---
    if (contact.axonaut_synced && contact.axonaut_company_id) {
      const companyId = Number(contact.axonaut_company_id)

      // Mode noteOnly
      if (noteOnly) {
        try {
          await syncUpdatesToAxonaut(companyId, apiKey, {
            newNote: noteContent || contact.note || '',
          })
          return NextResponse.json({ success: true })
        } catch (err) {
          console.error('Axonaut note sync error:', err)
          const message = err instanceof Error ? err.message : 'Erreur lors de la synchronisation de la note'
          return NextResponse.json({ error: message }, { status: 500 })
        }
      }

      // Mode tasksOnly
      if (tasksOnly && newTasks?.length) {
        try {
          await syncUpdatesToAxonaut(companyId, apiKey, { newTasks })
          return NextResponse.json({ success: true })
        } catch (err) {
          console.error('Axonaut tasks sync error:', err)
          const message = err instanceof Error ? err.message : 'Erreur lors de la synchronisation des tâches'
          return NextResponse.json({ error: message }, { status: 500 })
        }
      }

      // Re-sync complète non nécessaire pour un contact déjà sync
      return NextResponse.json({ success: true, already_synced: true })
    }

    // --- Cas A : Première synchronisation complète ---
    const scannedDate = formatDateDDMMYYYY(new Date(contact.scanned_at))
    const sourceComment = `Créé via ADtractive CRM Terrain — scanné le ${scannedDate} par ${contact.scanned_by_name}`

    // Étape 1 : Résoudre la company
    let companyId: number

    if (contact.axonaut_company_id && !isNaN(Number(contact.axonaut_company_id))) {
      companyId = Number(contact.axonaut_company_id)
    } else if (contact.societe) {
      const existing = await searchCompany(contact.societe, apiKey)
      if (existing.length > 0) {
        companyId = existing[0].id
      } else {
        const newCompany = await createCompany(
          {
            name: contact.societe,
            is_prospect: true,
            comments: sourceComment,
          },
          apiKey
        )
        companyId = newCompany.id
      }
    } else {
      return NextResponse.json(
        { error: 'Le champ société est requis pour la synchronisation Axonaut' },
        { status: 400 }
      )
    }

    // Étape 2 : Créer l'employee
    const employee = await createEmployee(
      {
        company_id: companyId,
        firstname: contact.prenom || '',
        lastname: contact.nom || '',
        email: contact.email || '',
        phone_number: contact.telephone || '',
        cellphone_number: contact.telephone_2 || '',
      },
      apiKey
    )

    try {
      await updateEmployee(employee.id, { comments: sourceComment }, apiKey)
    } catch {
      console.warn('Could not update employee comments')
    }

    // Étape 3 : Créer la note (si non vide)
    if (contact.note) {
      try {
        await createNote(
          {
            company_id: companyId,
            nature: 6,
            date: toAxonautRFC3339(new Date()),
            content: contact.note,
            is_done: true,
          },
          apiKey
        )
      } catch (err) {
        console.warn('Could not create note:', err)
      }
    }

    // Étape 4 : Créer les tâches
    if (contact.tasks?.length > 0) {
      for (const task of contact.tasks) {
        try {
          const dueDate = task.due_date
            ? formatDateDDMMYYYY(new Date(task.due_date))
            : formatDateDDMMYYYY(new Date())

          await createTask(
            {
              title: task.description,
              company_id: companyId,
              priority: 'normale',
              end_date: dueDate,
            },
            apiKey
          )
        } catch (err) {
          console.warn('Could not create task:', err)
        }
      }
    }

    // Étape 5 : Mettre à jour le contact en MongoDB
    await db.collection('contacts').updateOne(
      { _id: new ObjectId(contactId) },
      {
        $set: {
          axonaut_company_id: companyId.toString(),
          axonaut_employee_id: employee.id.toString(),
          axonaut_synced: true,
          synced_at: new Date(),
          updated_at: new Date(),
        },
      }
    )

    return NextResponse.json({
      success: true,
      axonaut_company_id: companyId.toString(),
      axonaut_employee_id: employee.id.toString(),
    })
  } catch (err) {
    console.error('Axonaut sync error:', err)
    const message = err instanceof Error ? err.message : 'Erreur lors de la synchronisation Axonaut'
    return NextResponse.json({ error: message }, { status: 500 })
  }
})
