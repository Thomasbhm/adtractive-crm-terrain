import { NextRequest, NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { withAuth } from '@/lib/auth'
import { connectToDatabase } from '@/lib/mongodb'

export const dynamic = 'force-dynamic'

interface PlanningItem {
  id: string
  description: string
  type: string
  due_date: string | null
  done: boolean
  hasTime: boolean
  // Contact
  contact_id: string
  contact_prenom: string
  contact_nom: string
  contact_societe: string
  axonaut_company_id?: string
  axonaut_synced: boolean
}

// Agrège toutes les tâches (locales + liées à un contact) de l'utilisateur
export const GET = withAuth(async (req: NextRequest, user) => {
  try {
    const { db } = await connectToDatabase()
    const { searchParams } = new URL(req.url)
    const includeDone = searchParams.get('includeDone') === 'true'

    const query: Record<string, unknown> = { org_id: new ObjectId(user.orgId) }
    if (user.role === 'commercial') {
      query.scanned_by = new ObjectId(user.userId)
    }

    const contacts = await db
      .collection('contacts')
      .find(query, {
        projection: {
          prenom: 1,
          nom: 1,
          societe: 1,
          tasks: 1,
          axonaut_company_id: 1,
          axonaut_synced: 1,
        },
      })
      .toArray()

    // On collecte TOUTES les tâches (pour les compteurs), puis on filtre les terminées
    // avant affichage si includeDone === false
    const allItems: PlanningItem[] = []
    for (const c of contacts) {
      if (!Array.isArray(c.tasks)) continue
      for (const t of c.tasks) {
        const due = t.due_date ? new Date(t.due_date) : null
        const hasTime =
          !!due &&
          (due.getHours() !== 0 || due.getMinutes() !== 0 || due.getSeconds() !== 0)

        allItems.push({
          id: t._id?.toString() || `${c._id}-${allItems.length}`,
          description: t.description || '',
          type: t.type || 'autre',
          due_date: due ? due.toISOString() : null,
          done: !!t.done,
          hasTime,
          contact_id: c._id.toString(),
          contact_prenom: c.prenom || '',
          contact_nom: c.nom || '',
          contact_societe: c.societe || '',
          axonaut_company_id: c.axonaut_company_id || undefined,
          axonaut_synced: !!c.axonaut_synced,
        })
      }
    }

    // Compteurs globaux (avant filtrage)
    const totalOpen = allItems.filter((i) => !i.done).length
    const totalDone = allItems.filter((i) => i.done).length

    // Items à afficher (filtrage selon includeDone)
    const items = includeDone ? allItems : allItems.filter((i) => !i.done)

    // Tri par date (sans date = fin)
    items.sort((a, b) => {
      if (!a.due_date && !b.due_date) return 0
      if (!a.due_date) return 1
      if (!b.due_date) return -1
      return new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
    })

    // Regrouper par période
    const now = new Date()
    const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const startTomorrow = new Date(startToday.getTime() + 24 * 60 * 60 * 1000)
    const startAfterTomorrow = new Date(startTomorrow.getTime() + 24 * 60 * 60 * 1000)
    const startNextWeek = new Date(startToday.getTime() + 7 * 24 * 60 * 60 * 1000)

    const groups: Record<string, PlanningItem[]> = {
      overdue: [],
      today: [],
      tomorrow: [],
      thisWeek: [],
      later: [],
      undated: [],
    }

    for (const item of items) {
      if (!item.due_date) {
        groups.undated.push(item)
        continue
      }
      const d = new Date(item.due_date)
      if (d < startToday) groups.overdue.push(item)
      else if (d < startTomorrow) groups.today.push(item)
      else if (d < startAfterTomorrow) groups.tomorrow.push(item)
      else if (d < startNextWeek) groups.thisWeek.push(item)
      else groups.later.push(item)
    }

    return NextResponse.json({
      groups,
      stats: {
        total: allItems.length,
        open: totalOpen,
        done: totalDone,
        overdue: groups.overdue.length,
        today: groups.today.length,
      },
    })
  } catch (err) {
    console.error('Planning error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
})
