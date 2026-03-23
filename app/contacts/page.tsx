'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import ContactCard from '@/components/ContactCard'

interface ContactSummary {
  _id: string
  prenom: string
  nom: string
  societe: string
  email: string
  source: 'scan_carte' | 'manuel'
  axonaut_synced: boolean
  scanned_at: string
}

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

export default function ContactsPage() {
  const router = useRouter()
  const [contacts, setContacts] = useState<ContactSummary[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<{ prenom: string; nom: string; role: string } | null>(null)

  // Axonaut results
  const [axonautEmployees, setAxonautEmployees] = useState<AxonautEmployee[]>([])
  const [axonautCompanies, setAxonautCompanies] = useState<AxonautCompany[]>([])
  const [axonautLoading, setAxonautLoading] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const stored = localStorage.getItem('user')
    if (stored) setUser(JSON.parse(stored))
    fetchContacts()
  }, [])

  // Recherche Axonaut en parallèle dès 3 caractères
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (search.length < 3) {
      setAxonautEmployees([])
      setAxonautCompanies([])
      return
    }

    debounceRef.current = setTimeout(() => searchAxonaut(search), 400)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [search]) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchContacts = async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/contacts?limit=100', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (res.ok) setContacts(data.contacts)
    } catch (err) {
      console.error('Fetch contacts error:', err)
    } finally {
      setLoading(false)
    }
  }

  const searchAxonaut = async (q: string) => {
    setAxonautLoading(true)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`/api/axonaut/search?q=${encodeURIComponent(q)}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setAxonautEmployees(data.employees || [])
        setAxonautCompanies(data.companies || [])
      }
    } catch {
      // Silencieux — on affiche quand même les résultats locaux
    } finally {
      setAxonautLoading(false)
    }
  }

  // Filtrer les contacts locaux
  const filtered = contacts.filter((c) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      c.prenom?.toLowerCase().includes(q) ||
      c.nom?.toLowerCase().includes(q) ||
      c.societe?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q)
    )
  })

  // Dédupliquer les résultats Axonaut (exclure ceux déjà dans les contacts locaux)
  const localEmails = new Set(contacts.map((c) => c.email?.toLowerCase()).filter(Boolean))
  const localNames = new Set(contacts.map((c) => `${c.prenom?.toLowerCase()} ${c.nom?.toLowerCase()}`))

  const filteredAxonautEmployees = axonautEmployees.filter((emp) => {
    if (emp.email && localEmails.has(emp.email.toLowerCase())) return false
    if (localNames.has(`${emp.firstname?.toLowerCase()} ${emp.lastname?.toLowerCase()}`)) return false
    return true
  })

  const hasAxonautResults = filteredAxonautEmployees.length > 0 || axonautCompanies.length > 0
  const showAxonautSection = search.length >= 3 && (hasAxonautResults || axonautLoading)

  return (
    <div className="min-h-screen bg-page">
      <Navbar prenom={user?.prenom} nom={user?.nom} role={user?.role} />

      <div className="p-4">
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => router.push('/scan')}
            className="min-h-[48px] min-w-[48px] flex items-center justify-center"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1B2B6B" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-xl font-bold text-primary">Mes contacts</h1>
        </div>

        {/* Barre de recherche unique */}
        <div className="relative mb-4">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#9CA3AF"
            strokeWidth="2"
            className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            type="text"
            placeholder="Rechercher par nom, société, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-3 min-h-[48px] border-[1.5px] border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-white"
          />
          {axonautLoading && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2">
              <div className="w-5 h-5 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
            </div>
          )}
        </div>

        <p className="text-xs text-secondary mb-4">La recherche s'effectue sur vos contacts CRM Terrain et sur Axonaut.</p>

        {/* Résultats */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Contacts CRM Terrain */}
            {filtered.length > 0 && (
              <div className="flex flex-col gap-3">
                {filtered.map((contact) => (
                  <ContactCard key={contact._id} contact={contact} />
                ))}
              </div>
            )}

            {/* Résultats Axonaut supplémentaires */}
            {showAxonautSection && (
              <div className={filtered.length > 0 ? 'mt-6' : ''}>
                {(filteredAxonautEmployees.length > 0 || axonautCompanies.length > 0) && (
                  <p className="text-xs text-secondary mb-3 uppercase tracking-wide font-semibold">
                    Également sur Axonaut
                  </p>
                )}

                {/* Contacts Axonaut */}
                {filteredAxonautEmployees.length > 0 && (
                  <div className="flex flex-col gap-2 mb-3">
                    {filteredAxonautEmployees.map((emp) => (
                      <a
                        key={`ax-emp-${emp.id}`}
                        href={`https://axonaut.com/business/employee/show/${emp.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-white rounded-xl p-4 shadow-card border border-gray-100 flex items-center justify-between hover:border-primary/30 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1B2B6B" strokeWidth="1.5">
                              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                              <circle cx="12" cy="7" r="4" />
                            </svg>
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{emp.firstname} {emp.lastname}</p>
                            {emp.email && <p className="text-xs text-secondary">{emp.email}</p>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-secondary bg-gray-100 px-2 py-0.5 rounded-full">Axonaut</span>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2">
                            <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" />
                          </svg>
                        </div>
                      </a>
                    ))}
                  </div>
                )}

                {/* Entreprises Axonaut */}
                {axonautCompanies.length > 0 && (
                  <div className="flex flex-col gap-2">
                    {axonautCompanies.map((comp) => (
                      <a
                        key={`ax-comp-${comp.id}`}
                        href={`https://axonaut.com/business/company/show/${comp.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-white rounded-xl p-4 shadow-card border border-gray-100 flex items-center justify-between hover:border-primary/30 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1B2B6B" strokeWidth="1.5">
                              <path d="M3 21h18M3 7v14M21 7v14M6 11h.01M6 15h.01M6 19h.01M10 11h.01M10 15h.01M10 19h.01M14 11h.01M14 15h.01M14 19h.01M18 11h.01M18 15h.01M18 19h.01M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3" />
                            </svg>
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{comp.name}</p>
                            <p className="text-xs text-secondary">
                              {comp.is_customer ? 'Client' : comp.is_prospect ? 'Prospect' : 'Entreprise'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-secondary bg-gray-100 px-2 py-0.5 rounded-full">Axonaut</span>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2">
                            <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" />
                          </svg>
                        </div>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Aucun résultat */}
            {filtered.length === 0 && !hasAxonautResults && !axonautLoading && (
              <div className="text-center py-12">
                <p className="text-secondary">
                  {search ? 'Aucun résultat trouvé' : 'Aucun contact pour le moment'}
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
