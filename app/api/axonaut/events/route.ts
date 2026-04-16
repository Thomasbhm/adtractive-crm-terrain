import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import { getUserAxonautKey, createEvent, toAxonautRFC3339 } from '@/lib/axonaut'

// Mapping type local (CRM terrain) → nature Axonaut
// Axonaut: 1=Réunion, 2=Email, 3=Appel, 4=Courrier, 5=SMS, 6=Note
const NATURE_MAP: Record<string, number> = {
  note: 6,
  email: 2,
  call: 3,
  appel: 3,
  meeting: 1,
  reunion: 1,
  réunion: 1,
  courrier: 4,
  sms: 5,
}

export const POST = withAuth(async (req: NextRequest, user) => {
  try {
    const body = await req.json()
    const { companyId, type, title, content, date, duration, employeeEmail } = body

    const cid = Number(companyId)
    if (!cid || Number.isNaN(cid)) {
      return NextResponse.json({ error: 'companyId invalide' }, { status: 400 })
    }

    const nature = NATURE_MAP[String(type).toLowerCase()] || 6
    if (!content || typeof content !== 'string') {
      return NextResponse.json({ error: 'Contenu requis' }, { status: 400 })
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

    try {
      const event = await createEvent(
        {
          company_id: cid,
          nature,
          date: date ? toAxonautRFC3339(new Date(date)) : toAxonautRFC3339(new Date()),
          content,
          is_done: true,
          ...(title ? { title } : {}),
          ...(duration ? { duration: Number(duration) } : {}),
          ...(employeeEmail ? { employee_email: employeeEmail } : {}),
        },
        apiKey
      )
      return NextResponse.json({ success: true, event })
    } catch (err) {
      console.error('Axonaut create event error:', err)
      const msg = err instanceof Error ? err.message : 'Erreur Axonaut'
      return NextResponse.json({ error: msg }, { status: 500 })
    }
  } catch (err) {
    console.error('Event route error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
})
