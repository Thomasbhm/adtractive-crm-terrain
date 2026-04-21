'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Modal from '@/components/ui/Modal'
import Toast from '@/components/ui/Toast'

interface UserData {
  _id: string
  nom: string
  prenom: string
  email: string
  role: string
  is_active: boolean
}

interface Stats {
  contacts_this_month: number
  contacts_by_user: Array<{ _id: string; name: string; count: number }>
}

const EyeIcon = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
)

const EyeOffIcon = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
)

export default function AdminPage() {
  const router = useRouter()
  const [user, setUser] = useState<{ prenom: string; nom: string; role: string; email?: string } | null>(null)
  const [openaiKey, setOpenaiKey] = useState('')
  const [hasOpenaiKey, setHasOpenaiKey] = useState(false)
  const [showOpenai, setShowOpenai] = useState(false)
  const [users, setUsers] = useState<UserData[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [showCreateUser, setShowCreateUser] = useState(false)
  const [newUser, setNewUser] = useState({ nom: '', prenom: '', email: '', password: '', role: 'commercial' as 'admin' | 'commercial' })
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [savingSettings, setSavingSettings] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem('user')
    if (stored) {
      const u = JSON.parse(stored)
      setUser(u)
      if (u.role !== 'admin') {
        router.replace('/planning')
        return
      }
    }
    fetchUsers()
    fetchStats()
    fetchOrgSettings()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const getToken = () => localStorage.getItem('token')

  const fetchOrgSettings = async () => {
    try {
      const res = await fetch('/api/auth/me', { headers: { Authorization: `Bearer ${getToken()}` } })
      if (res.ok) {
        const data = await res.json()
        // We'll use a dedicated endpoint or check if keys exist
        if (data.org_has_openai_key) setHasOpenaiKey(true)
      }
    } catch {
      // ignore
    }
  }

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/admin/users', { headers: { Authorization: `Bearer ${getToken()}` } })
      if (res.ok) setUsers(await res.json())
    } catch (err) {
      console.error(err)
    }
  }

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/admin/stats', { headers: { Authorization: `Bearer ${getToken()}` } })
      if (res.ok) setStats(await res.json())
    } catch (err) {
      console.error(err)
    }
  }

  const saveSettings = async () => {
    setSavingSettings(true)
    try {
      const body: Record<string, string> = {}
      if (openaiKey) body.openai_api_key = openaiKey

      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify(body),
      })

      if (!res.ok) throw new Error()
      setToast({ message: 'Paramètres sauvegardés !', type: 'success' })
      if (openaiKey) setHasOpenaiKey(true)
      setOpenaiKey('')
      setShowOpenai(false)
    } catch {
      setToast({ message: 'Erreur lors de la sauvegarde', type: 'error' })
    } finally {
      setSavingSettings(false)
    }
  }

  const createUser = async () => {
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify(newUser),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error)
      }

      setToast({ message: 'Compte créé !', type: 'success' })
      setShowCreateUser(false)
      setNewUser({ nom: '', prenom: '', email: '', password: '', role: 'commercial' })
      fetchUsers()
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : 'Erreur', type: 'error' })
    }
  }

  return (
    <div className="min-h-screen bg-page">
      <Navbar prenom={user?.prenom} nom={user?.nom} role={user?.role} />
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="p-4 pb-24">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => router.push('/planning')} className="min-h-[48px] min-w-[48px] flex items-center justify-center">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1B2B6B" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-xl font-bold text-primary">Administration</h1>
        </div>

        {/* API Settings */}
        <section className="bg-white rounded-2xl p-4 shadow-card border border-gray-100 mb-6">
          <h2 className="font-bold text-primary mb-4">Paramètres API</h2>

          <div className="flex flex-col gap-4">
            {/* OpenAI Key */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">OpenAI API Key</label>
              <div className="relative">
                <input
                  type={showOpenai ? 'text' : 'password'}
                  value={openaiKey}
                  onChange={(e) => setOpenaiKey(e.target.value)}
                  placeholder={hasOpenaiKey ? '••••••••••••••••' : 'sk-...'}
                  className="w-full px-4 pr-12 py-3 min-h-[48px] border-[1.5px] border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={() => setShowOpenai(!showOpenai)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 min-w-[44px] min-h-[44px] flex items-center justify-center"
                >
                  {showOpenai ? EyeOffIcon : EyeIcon}
                </button>
              </div>
              {hasOpenaiKey && !openaiKey && (
                <p className="text-xs text-green-600 mt-1">Clé configurée</p>
              )}
            </div>

            <p className="text-xs text-secondary">
              La clé API Axonaut est désormais configurée individuellement par chaque utilisateur lors de l'onboarding.
            </p>

            <Button variant="primary" className="shadow-btn" onClick={saveSettings} disabled={savingSettings || !openaiKey}>
              {savingSettings ? 'Sauvegarde...' : 'Sauvegarder'}
            </Button>
          </div>
        </section>

        {/* Team */}
        <section className="bg-white rounded-2xl p-4 shadow-card border border-gray-100 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-primary">Équipe</h2>
            <Button variant="accent" size="sm" onClick={() => setShowCreateUser(true)}>
              + Créer un compte
            </Button>
          </div>

          <div className="flex flex-col gap-2">
            {users.map((u) => (
              <div key={u._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <div>
                  <p className="font-medium text-sm">{u.prenom} {u.nom}</p>
                  <p className="text-xs text-secondary">{u.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-1 rounded-full ${u.role === 'admin' ? 'bg-primary text-white' : 'bg-gray-200 text-gray-600'}`}>
                    {u.role}
                  </span>
                  <span className={`w-2 h-2 rounded-full ${u.is_active ? 'bg-green-500' : 'bg-red-500'}`} />
                  {u.email !== user?.email && (
                    <button
                      onClick={async () => {
                        if (!confirm(`Supprimer le compte de ${u.prenom} ${u.nom} ?`)) return
                        try {
                          const res = await fetch(`/api/admin/users?id=${u._id}`, {
                            method: 'DELETE',
                            headers: { Authorization: `Bearer ${getToken()}` },
                          })
                          if (!res.ok) {
                            const data = await res.json()
                            throw new Error(data.error)
                          }
                          setToast({ message: 'Compte supprimé', type: 'success' })
                          fetchUsers()
                        } catch (err) {
                          setToast({ message: err instanceof Error ? err.message : 'Erreur', type: 'error' })
                        }
                      }}
                      className="min-w-[32px] min-h-[32px] flex items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Supprimer ce compte"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <polyline points="3,6 5,6 21,6" />
                        <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Stats */}
        <section className="bg-white rounded-2xl p-4 shadow-card border border-gray-100 mb-6">
          <h2 className="font-bold text-primary mb-4">Statistiques</h2>

          {stats ? (
            <>
              <div className="bg-accent/10 rounded-xl p-4 mb-4">
                <p className="text-sm text-secondary">Contacts ce mois</p>
                <p className="text-3xl font-bold text-primary">{stats.contacts_this_month}</p>
              </div>

              {stats.contacts_by_user.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-secondary mb-2">Par commercial</p>
                  <div className="flex flex-col gap-2">
                    {stats.contacts_by_user.map((item) => (
                      <div key={item._id} className="flex items-center justify-between p-2">
                        <span className="text-sm">{item.name}</span>
                        <span className="font-bold text-primary">{item.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-secondary">Chargement...</p>
          )}
        </section>

        {/* v0.5 placeholder */}
        <section className="bg-white rounded-2xl p-4 shadow-card border border-gray-100 border-dashed opacity-60">
          <h2 className="font-bold text-secondary mb-2">Dashboard avancé</h2>
          <p className="text-sm text-secondary">Disponible en v0.5</p>
        </section>
      </div>

      {/* Create User Modal */}
      <Modal isOpen={showCreateUser} onClose={() => setShowCreateUser(false)} title="Créer un compte">
        <div className="flex flex-col gap-3">
          <Input label="Prénom" value={newUser.prenom} onChange={(e) => setNewUser({ ...newUser, prenom: e.target.value })} />
          <Input label="Nom" value={newUser.nom} onChange={(e) => setNewUser({ ...newUser, nom: e.target.value })} />
          <Input label="Email" type="email" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} />
          <div>
            <Input label="Mot de passe temporaire" type="text" value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} />
            <p className="text-xs text-secondary mt-1">L'utilisateur devra changer son mot de passe lors de sa première connexion.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Rôle</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setNewUser({ ...newUser, role: 'commercial' })}
                className={`flex-1 px-4 py-3 min-h-[48px] rounded-xl text-sm font-medium border-[1.5px] transition-all ${
                  newUser.role === 'commercial'
                    ? 'border-primary bg-primary text-white'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                }`}
              >
                Commercial
              </button>
              <button
                type="button"
                onClick={() => setNewUser({ ...newUser, role: 'admin' })}
                className={`flex-1 px-4 py-3 min-h-[48px] rounded-xl text-sm font-medium border-[1.5px] transition-all ${
                  newUser.role === 'admin'
                    ? 'border-primary bg-primary text-white'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                }`}
              >
                Admin
              </button>
            </div>
          </div>
          <div className="flex gap-3 mt-2">
            <Button variant="outline" fullWidth onClick={() => setShowCreateUser(false)}>Annuler</Button>
            <Button variant="primary" fullWidth onClick={createUser} disabled={!newUser.email || !newUser.password}>Créer</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
