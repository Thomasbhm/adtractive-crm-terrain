import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import { getUserAxonautKey, createTask, createEvent, toAxonautRFC3339 } from '@/lib/axonaut'

function formatDateDDMMYYYY(date: Date): string {
  const d = date.getDate().toString().padStart(2, '0')
  const m = (date.getMonth() + 1).toString().padStart(2, '0')
  const y = date.getFullYear()
  return `${d}/${m}/${y}`
}

function hasTimeComponent(dateStr: string | undefined): boolean {
  if (!dateStr) return false
  // Si on nous passe "YYYY-MM-DD" (date only), pas d'heure
  // Si on nous passe "YYYY-MM-DDTHH:MM" ou ISO complet, on vérifie si l'heure est non-zero
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return false
  return d.getHours() !== 0 || d.getMinutes() !== 0 || d.getSeconds() !== 0
}

export const POST = withAuth(async (req: NextRequest, user) => {
  try {
    const body = await req.json()
    const { companyId, title, dueDate, priority, type, duration } = body as {
      companyId?: number | string
      title?: string
      dueDate?: string
      priority?: string
      type?: string
      duration?: number
    }

    const cid = Number(companyId)
    if (!cid || Number.isNaN(cid)) {
      return NextResponse.json({ error: 'companyId invalide' }, { status: 400 })
    }
    if (!title || typeof title !== 'string') {
      return NextResponse.json({ error: 'Titre requis' }, { status: 400 })
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

    const withTime = hasTimeComponent(dueDate)

    // Cas spécial : réunion avec heure → créer un Event (nature=1) qui supporte l'heure + durée
    // L'API /tasks Axonaut ne supporte pas l'heure. Les événements, si.
    if (type === 'reunion' && withTime && dueDate) {
      try {
        const event = await createEvent(
          {
            company_id: cid,
            nature: 1, // Réunion
            date: toAxonautRFC3339(new Date(dueDate)),
            content: title,
            is_done: false,
            title,
            duration: duration || 60,
          },
          apiKey
        )
        return NextResponse.json({ success: true, created_as: 'event', event })
      } catch (err) {
        console.error('Axonaut create event error:', err)
        const msg = err instanceof Error ? err.message : 'Erreur Axonaut'
        return NextResponse.json({ error: msg }, { status: 500 })
      }
    }

    // Sinon : Task standard. Si une heure était renseignée mais pas sur une réunion,
    // on encode l'heure dans le titre pour que l'info ne soit pas perdue côté Axonaut.
    let finalTitle = title
    if (withTime && dueDate) {
      const d = new Date(dueDate)
      const h = d.getHours().toString().padStart(2, '0')
      const m = d.getMinutes().toString().padStart(2, '0')
      finalTitle = `[${h}:${m}] ${title}`
    }

    try {
      const task = await createTask(
        {
          company_id: cid,
          title: finalTitle,
          priority: priority || 'normale',
          end_date: dueDate
            ? formatDateDDMMYYYY(new Date(dueDate))
            : formatDateDDMMYYYY(new Date()),
        },
        apiKey
      )
      return NextResponse.json({ success: true, created_as: 'task', task })
    } catch (err) {
      console.error('Axonaut create task error:', err)
      const msg = err instanceof Error ? err.message : 'Erreur Axonaut'
      return NextResponse.json({ error: msg }, { status: 500 })
    }
  } catch (err) {
    console.error('Task route error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
})
