import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import {
  getUserAxonautKey,
  getCompany,
  getCompanyEmployees,
  getCompanyEvents,
  getCompanyQuotations,
  getCompanyInvoices,
  getCompanyOpportunities,
} from '@/lib/axonaut'

export const dynamic = 'force-dynamic'

export const GET = withAuth(async (req, user, ctx) => {
    const companyId = Number(ctx?.params?.companyId)
    if (!companyId || Number.isNaN(companyId)) {
      return NextResponse.json({ error: 'ID invalide' }, { status: 400 })
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
      const [company, employees, events, quotations, invoices, opportunities] =
        await Promise.all([
          getCompany(companyId, apiKey),
          getCompanyEmployees(companyId, apiKey).catch(() => []),
          getCompanyEvents(companyId, apiKey).catch(() => []),
          getCompanyQuotations(companyId, apiKey).catch(() => []),
          getCompanyInvoices(companyId, apiKey).catch(() => []),
          getCompanyOpportunities(companyId, apiKey).catch(() => []),
        ])

      // Tri events par date desc + limite 15
      const sortedEvents = [...(events || [])]
        .sort((a: any, b: any) => {
          const ta = a.timestamp ?? new Date(a.date).getTime() / 1000
          const tb = b.timestamp ?? new Date(b.date).getTime() / 1000
          return (tb || 0) - (ta || 0)
        })
        .slice(0, 15)

      // Devis / factures / opportunités : 5 plus récents
      const topN = <T extends { date?: any; creation_date?: any; last_update_date?: any }>(
        arr: T[],
        n = 5
      ) =>
        [...arr]
          .sort((a, b) => {
            const da =
              toEpoch(a.last_update_date) ||
              toEpoch(a.date) ||
              toEpoch(a.creation_date) ||
              0
            const db =
              toEpoch(b.last_update_date) ||
              toEpoch(b.date) ||
              toEpoch(b.creation_date) ||
              0
            return db - da
          })
          .slice(0, n)

      return NextResponse.json({
        company,
        employees: employees || [],
        events: sortedEvents,
        quotations: topN(quotations || []),
        invoices: topN(invoices || []),
        opportunities: topN(opportunities || []),
      })
    } catch (err) {
      console.error('Axonaut company-detail error:', err)
      const msg = err instanceof Error ? err.message : 'Erreur Axonaut'
      return NextResponse.json({ error: msg }, { status: 500 })
    }
  }
)

// Convertit timestamp Unix (string/number) ou date ISO en epoch (ms)
function toEpoch(value: any): number {
  if (!value) return 0
  if (typeof value === 'number') {
    return value > 1e12 ? value : value * 1000
  }
  if (typeof value === 'string') {
    if (/^\d+$/.test(value)) {
      const n = Number(value)
      return n > 1e12 ? n : n * 1000
    }
    const t = Date.parse(value)
    return Number.isNaN(t) ? 0 : t
  }
  return 0
}
