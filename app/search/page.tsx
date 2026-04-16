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

export default function SearchPage() {
  const router = useRouter()
  const [user, setUser] = useState<{ prenom: string; nom: string; role: string } | null>(null)
  const [query, setQuery] = useState('')
  const [employees, setEmployees] = useState<AxonautEmployee[]>([])
  const [companies, setCompanies] = useState<AxonautCompany[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [searched, setSearched] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      router.replace('/login')
      return
    }
    const stored = localStorage.getItem('user')
    if (stored) setUser(JSON.parse(stored))
  }, [router])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (query.length < 3) {
      setEmployees([])
      setCompanies([])
      setSearched(false)
      setError('')
      return
    }

    debounceRef.current = setTimeout(() => {
      performSearch(query)
    }, 400)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query]) // eslint-disable-line react-hooks/exhaustive-deps

  const performSearch = async (q: string) => {
    setLoading(true)
    setError('')
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`/api/axonaut/search?q=${encodeURIComponent(q)}`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erreur')
      }

      const data = await res.json()
      setEmployees(data.employees || [])
      setCompanies(data.companies || [])
      setSearched(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de contacter Axonaut. Vérifiez votre connexion.')
    } finally {
      setLoading(false)
    }
  }

  const totalResults = employees.length + companies.length

  return (
    <div className="min-h-screen bg-page">
      <Navbar prenom={user?.prenom} nom={user?.nom} role={user?.role} />

      <div className="p-4 pb-24">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => router.back()}
            className="min-h-[48px] min-w-[48px] flex items-center justify-center"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1B2B6B" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-xl font-bold text-primary">Rechercher dans Axonaut</h1>
        </div>

        {/* Search input */}
        <div className="relative mb-6">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#9CA3AF"
            strokeWidth="2"
            className="absolute left-4 top-1/2 -translate-y-1/2"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Nom, société, email..."
            className="w-full pl-12 pr-4 py-3 min-h-[48px] border-[1.5px] border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-white"
            autoFocus
          />
          {loading && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2">
              <div className="w-5 h-5 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm mb-4">
            {error}
          </div>
        )}

        {/* Results */}
        {searched && !error && (
          <>
            {totalResults === 0 ? (
              <div className="text-center py-12">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#D1D5DB" strokeWidth="1.5" className="mx-auto mb-3">
                  <circle cx="11" cy="11" r="8" />
                  <path d="M21 21l-4.35-4.35" />
                </svg>
                <p className="text-secondary">Aucun résultat trouvé dans Axonaut pour cette recherche.</p>
              </div>
            ) : (
              <p className="text-sm text-secondary mb-4">{totalResults} résultat{totalResults > 1 ? 's' : ''}</p>
            )}

            {/* Contacts section */}
            {employees.length > 0 && (
              <div className="mb-6">
                <h2 className="text-sm font-semibold text-primary uppercase tracking-wide mb-3">Contacts</h2>
                <div className="flex flex-col gap-2">
                  {employees.map((emp) => (
                    <div
                      key={emp.id}
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
                          <p className="font-medium text-gray-900 truncate">{emp.firstname} {emp.lastname}</p>
                          {emp.email && <p className="text-xs text-secondary truncate">{emp.email}</p>}
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
              </div>
            )}

            {/* Companies section */}
            {companies.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-primary uppercase tracking-wide mb-3">Entreprises</h2>
                <div className="flex flex-col gap-2">
                  {companies.map((comp) => (
                    <div
                      key={comp.id}
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
                          <p className="font-medium text-gray-900 truncate">{comp.name}</p>
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
              </div>
            )}
          </>
        )}
      </div>

      <BottomNav prenom={user?.prenom} nom={user?.nom} role={user?.role} />
    </div>
  )
}
