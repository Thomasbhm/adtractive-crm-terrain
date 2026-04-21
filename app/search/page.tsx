'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import BottomNav from '@/components/BottomNav'

interface AxonautEmployee {
  id: number
  firstname: string
  lastname: string
  email: string
  company_id: number
}

interface AxonautCompany {
  id: number
  name: string
  is_prospect: boolean
  is_customer: boolean
}

interface LocalContact {
  _id: string
  prenom: string
  nom: string
  societe: string
  email: string
  telephone: string
  telephone_2: string
  note: string
  poste: string
  adresse: string
  axonaut_company_id: string
  axonaut_synced: boolean
}

/** Returns a short snippet explaining WHY this contact matched the query */
function matchReason(contact: LocalContact, q: string): string | null {
  if (!q) return null
  const lq = q.toLowerCase()
  if (contact.email?.toLowerCase().includes(lq)) return `📧 ${contact.email}`
  if (contact.telephone?.toLowerCase().includes(lq)) return `📞 ${contact.telephone}`
  if (contact.telephone_2?.toLowerCase().includes(lq)) return `📞 ${contact.telephone_2}`
  if (contact.adresse?.toLowerCase().includes(lq)) return `📍 ${contact.adresse}`
  if (contact.poste?.toLowerCase().includes(lq)) return `💼 ${contact.poste}`
  if (contact.note?.toLowerCase().includes(lq)) {
    // Grab a short snippet around the match
    const idx = contact.note.toLowerCase().indexOf(lq)
    const start = Math.max(0, idx - 20)
    const end = Math.min(contact.note.length, idx + q.length + 20)
    const snippet = (start > 0 ? '…' : '') + contact.note.slice(start, end) + (end < contact.note.length ? '…' : '')
    return `📝 ${snippet}`
  }
  return null
}

function Highlight({ text, query }: { text: string; query: string }) {
  if (!query || !text) return <span>{text}</span>
  const idx = text.toLowerCase().indexOf(query.toLowerCase())
  if (idx === -1) return <span>{text}</span>
  return (
    <span>
      {text.slice(0, idx)}
      <mark className="bg-yellow-100 text-yellow-900 rounded px-0.5">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </span>
  )
}

export default function SearchPage() {
  const router = useRouter()
  const [user, setUser] = useState<{ prenom: string; nom: string; role: string } | null>(null)
  const [query, setQuery] = useState('')
  const [employees, setEmployees] = useState<AxonautEmployee[]>([])
  const [companies, setCompanies] = useState<AxonautCompany[]>([])
  const [localContacts, setLocalContacts] = useState<LocalContact[]>([])
  const [loading, setLoading] = useState(false)
  const [axonautError, setAxonautError] = useState('')
  const [searched, setSearched] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) { router.replace('/login'); return }
    const stored = localStorage.getItem('user')
    if (stored) setUser(JSON.parse(stored))
  }, [router])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (query.length < 2) {
      setEmployees([])
      setCompanies([])
      setLocalContacts([])
      setSearched(false)
      setAxonautError('')
      return
    }

    debounceRef.current = setTimeout(() => {
      performSearch(query)
    }, 350)

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query]) // eslint-disable-line react-hooks/exhaustive-deps

  const performSearch = async (q: string) => {
    setLoading(true)
    setAxonautError('')

    const token = localStorage.getItem('token')
    const headers = { Authorization: `Bearer ${token}` }

    // Run local + Axonaut in parallel
    const [localRes, axonautRes] = await Promise.allSettled([
      fetch(`/api/contacts?q=${encodeURIComponent(q)}&limit=5`, { headers }),
      fetch(`/api/axonaut/search?q=${encodeURIComponent(q)}`, { headers }),
    ])

    // Local contacts
    if (localRes.status === 'fulfilled' && localRes.value.ok) {
      const data = await localRes.value.json()
      setLocalContacts(data.contacts || [])
    } else {
      setLocalContacts([])
    }

    // Axonaut
    if (axonautRes.status === 'fulfilled' && axonautRes.value.ok) {
      const data = await axonautRes.value.json()
      setEmployees(data.employees || [])
      setCompanies(data.companies || [])
    } else {
      setEmployees([])
      setCompanies([])
      if (axonautRes.status === 'fulfilled') {
        const data = await axonautRes.value.json().catch(() => ({}))
        setAxonautError(data.error || 'Axonaut indisponible')
      }
    }

    setSearched(true)
    setLoading(false)
  }

  const totalResults = localContacts.length + employees.length + companies.length

  const localContactUrl = (c: LocalContact) =>
    c.axonaut_company_id
      ? `/contacts/axonaut/company/${c.axonaut_company_id}`
      : `/contacts/local/${c._id}`

  return (
    <div className="min-h-screen bg-page">
      <Navbar prenom={user?.prenom} nom={user?.nom} role={user?.role} />

      <div className="p-4 pb-24">
        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <button
            onClick={() => router.back()}
            className="min-h-[48px] min-w-[48px] flex items-center justify-center"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1B2B6B" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-xl font-bold text-primary">Rechercher</h1>
        </div>

        {/* Search input */}
        <div className="relative mb-2">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2"
            className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Nom, société, email, téléphone..."
            className="w-full pl-12 pr-10 py-3 min-h-[48px] border-[1.5px] border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-white"
            autoFocus
          />
          {loading && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2">
              <div className="w-5 h-5 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
            </div>
          )}
          {!loading && query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>

        {/* Search scope hint */}
        <p className="text-xs text-secondary mb-5 pl-1">
          Recherche dans : nom, société, email, téléphone, adresse, notes · base CRM + Axonaut
        </p>

        {/* Axonaut error (non-blocking) */}
        {axonautError && (
          <div className="bg-amber-50 border border-amber-200 text-amber-700 px-4 py-2 rounded-xl text-sm mb-4 flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            Axonaut : {axonautError}
          </div>
        )}

        {/* Results */}
        {searched && !loading && (
          <>
            {totalResults === 0 ? (
              <div className="text-center py-12">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#D1D5DB" strokeWidth="1.5" className="mx-auto mb-3">
                  <circle cx="11" cy="11" r="8" />
                  <path d="M21 21l-4.35-4.35" />
                </svg>
                <p className="text-secondary font-medium">Aucun résultat</p>
                <p className="text-xs text-secondary mt-1">pour «&nbsp;{query}&nbsp;»</p>
              </div>
            ) : (
              <p className="text-sm text-secondary mb-4">
                {totalResults} résultat{totalResults > 1 ? 's' : ''} pour «&nbsp;{query}&nbsp;»
              </p>
            )}

            {/* ── CRM local ── */}
            {localContacts.length > 0 && (
              <section className="mb-6">
                <h2 className="text-xs font-semibold text-primary uppercase tracking-wider mb-2 pl-1">
                  CRM local ({localContacts.length})
                </h2>
                <div className="flex flex-col gap-2">
                  {localContacts.map((c) => {
                    const initials = `${c.prenom?.[0] ?? ''}${c.nom?.[0] ?? ''}`.toUpperCase() || '?'
                    const reason = matchReason(c, query)
                    return (
                      <button
                        key={c._id}
                        onClick={() => router.push(localContactUrl(c))}
                        className="bg-white rounded-xl p-4 shadow-card border border-gray-100 flex items-center gap-3 text-left hover:border-primary/30 transition-colors w-full"
                      >
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 text-sm font-bold text-primary">
                          {initials}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-gray-900 truncate">
                            <Highlight text={`${c.prenom} ${c.nom}`.trim()} query={query} />
                          </p>
                          {c.societe && (
                            <p className="text-xs text-secondary truncate">
                              <Highlight text={c.societe} query={query} />
                            </p>
                          )}
                          {reason && (
                            <p className="text-xs text-ink-muted mt-0.5 truncate">{reason}</p>
                          )}
                        </div>
                        {c.axonaut_synced && (
                          <span className="flex-shrink-0 w-2 h-2 rounded-full bg-action" title="Synchronisé Axonaut" />
                        )}
                      </button>
                    )
                  })}
                </div>
              </section>
            )}

            {/* ── Contacts Axonaut ── */}
            {employees.length > 0 && (
              <section className="mb-6">
                <h2 className="text-xs font-semibold text-primary uppercase tracking-wider mb-2 pl-1">
                  Contacts Axonaut ({employees.length})
                </h2>
                <div className="flex flex-col gap-2">
                  {employees.map((emp) => (
                    <div key={emp.id}
                      className="bg-white rounded-xl p-4 shadow-card border border-gray-100 flex items-center justify-between hover:border-primary/30 transition-colors"
                    >
                      <button
                        onClick={() => router.push(`/contacts/axonaut/employee/${emp.id}`)}
                        className="flex items-center gap-3 flex-1 text-left min-w-0"
                      >
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1B2B6B" strokeWidth="1.5">
                            <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                            <circle cx="12" cy="7" r="4" />
                          </svg>
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 truncate">
                            <Highlight text={`${emp.firstname} ${emp.lastname}`.trim()} query={query} />
                          </p>
                          {emp.email && (
                            <p className="text-xs text-secondary truncate">
                              <Highlight text={emp.email} query={query} />
                            </p>
                          )}
                        </div>
                      </button>
                      <a
                        href={`https://axonaut.com/business/employee/show/${emp.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        aria-label="Ouvrir dans Axonaut"
                        className="ml-2 p-2 rounded-lg text-secondary hover:text-primary hover:bg-primary/5"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" />
                        </svg>
                      </a>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* ── Entreprises Axonaut ── */}
            {companies.length > 0 && (
              <section className="mb-6">
                <h2 className="text-xs font-semibold text-primary uppercase tracking-wider mb-2 pl-1">
                  Entreprises Axonaut ({companies.length})
                </h2>
                <div className="flex flex-col gap-2">
                  {companies.map((comp) => (
                    <div key={comp.id}
                      className="bg-white rounded-xl p-4 shadow-card border border-gray-100 flex items-center justify-between hover:border-primary/30 transition-colors"
                    >
                      <button
                        onClick={() => router.push(`/contacts/axonaut/company/${comp.id}`)}
                        className="flex items-center gap-3 flex-1 text-left min-w-0"
                      >
                        <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1B2B6B" strokeWidth="1.5">
                            <path d="M3 21h18M3 7v14M21 7v14M6 11h.01M6 15h.01M6 19h.01M10 11h.01M10 15h.01M10 19h.01M14 11h.01M14 15h.01M14 19h.01M18 11h.01M18 15h.01M18 19h.01M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3" />
                          </svg>
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 truncate">
                            <Highlight text={comp.name} query={query} />
                          </p>
                          <p className="text-xs text-secondary">
                            {comp.is_customer ? 'Client' : comp.is_prospect ? 'Prospect' : 'Entreprise'}
                          </p>
                        </div>
                      </button>
                      <a
                        href={`https://axonaut.com/business/company/show/${comp.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        aria-label="Ouvrir dans Axonaut"
                        className="ml-2 p-2 rounded-lg text-secondary hover:text-primary hover:bg-primary/5"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" />
                        </svg>
                      </a>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}

        {/* Empty state before search */}
        {!searched && !loading && (
          <div className="text-center py-12 text-secondary">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#D1D5DB" strokeWidth="1.5" className="mx-auto mb-3">
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
            <p className="text-sm">Tapez au moins 2 caractères</p>
          </div>
        )}
      </div>

      <BottomNav prenom={user?.prenom} nom={user?.nom} role={user?.role} />
    </div>
  )
}
