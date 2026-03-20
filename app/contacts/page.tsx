'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import ContactCard from '@/components/ContactCard'
import Input from '@/components/ui/Input'

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

export default function ContactsPage() {
  const router = useRouter()
  const [contacts, setContacts] = useState<ContactSummary[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<{ prenom: string; nom: string; role: string } | null>(null)

  useEffect(() => {
    const stored = localStorage.getItem('user')
    if (stored) setUser(JSON.parse(stored))

    fetchContacts()
  }, [])

  const fetchContacts = async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/contacts?limit=100', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (res.ok) {
        setContacts(data.contacts)
      }
    } catch (err) {
      console.error('Fetch contacts error:', err)
    } finally {
      setLoading(false)
    }
  }

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

        <div className="mb-4">
          <Input
            placeholder="Rechercher par nom, société, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-secondary">
              {search ? 'Aucun résultat trouvé' : 'Aucun contact pour le moment'}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filtered.map((contact) => (
              <ContactCard key={contact._id} contact={contact} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
