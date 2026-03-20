'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import Toast from '@/components/ui/Toast'
import TaskForm, { TaskData } from '@/components/TaskForm'

interface Task {
  _id: string
  description: string
  due_date: string
  type: string
  done: boolean
}

interface ContactDetail {
  _id: string
  prenom: string
  nom: string
  societe: string
  poste: string
  email: string
  telephone: string
  telephone_2: string
  adresse: string
  site_web: string
  linkedin: string
  note: string
  source: string
  card_image_url: string
  axonaut_synced: boolean
  tasks: Task[]
  scanned_at: string
  scanned_by_name: string
}

export default function ContactDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [contact, setContact] = useState<ContactDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [user, setUser] = useState<{ prenom: string; nom: string; role: string } | null>(null)
  const [showTaskForm, setShowTaskForm] = useState(false)
  const [imageFullscreen, setImageFullscreen] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem('user')
    if (stored) setUser(JSON.parse(stored))
    fetchContact()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchContact = async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`/api/contacts/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        setContact(await res.json())
      }
    } catch (err) {
      console.error('Fetch contact error:', err)
    } finally {
      setLoading(false)
    }
  }

  const updateField = (field: string, value: string) => {
    if (!contact) return
    setContact({ ...contact, [field]: value })
  }

  const handleSave = async () => {
    if (!contact) return
    setSaving(true)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`/api/contacts/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          prenom: contact.prenom,
          nom: contact.nom,
          societe: contact.societe,
          poste: contact.poste,
          email: contact.email,
          telephone: contact.telephone,
          telephone_2: contact.telephone_2,
          adresse: contact.adresse,
          site_web: contact.site_web,
          linkedin: contact.linkedin,
          note: contact.note,
          tasks: contact.tasks,
        }),
      })

      if (!res.ok) throw new Error('Erreur lors de la sauvegarde')
      setToast({ message: 'Contact sauvegardé !', type: 'success' })
    } catch {
      setToast({ message: 'Erreur lors de la sauvegarde', type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const toggleTaskDone = async (taskIndex: number) => {
    if (!contact) return
    const updatedTasks = [...contact.tasks]
    updatedTasks[taskIndex] = { ...updatedTasks[taskIndex], done: !updatedTasks[taskIndex].done }

    const token = localStorage.getItem('token')
    try {
      const res = await fetch(`/api/contacts/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ tasks: updatedTasks }),
      })

      if (res.ok) {
        setContact({ ...contact, tasks: updatedTasks })
      }
    } catch (err) {
      console.error('Toggle task error:', err)
    }
  }

  const addTask = (task: TaskData) => {
    if (!contact) return
    setContact({
      ...contact,
      tasks: [
        ...contact.tasks,
        {
          _id: Date.now().toString(),
          description: task.description,
          type: task.type,
          due_date: task.due_date,
          done: false,
        },
      ],
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-page">
        <Navbar prenom={user?.prenom} nom={user?.nom} role={user?.role} />
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  if (!contact) {
    return (
      <div className="min-h-screen bg-page">
        <Navbar prenom={user?.prenom} nom={user?.nom} role={user?.role} />
        <div className="text-center py-12 text-secondary">Contact non trouvé</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-page">
      <Navbar prenom={user?.prenom} nom={user?.nom} role={user?.role} />
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="p-4 pb-24">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => router.push('/contacts')}
            className="min-h-[48px] min-w-[48px] flex items-center justify-center"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1B2B6B" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-xl font-bold text-primary">
              {contact.prenom} {contact.nom}
            </h1>
            <p className="text-sm text-secondary">
              {contact.scanned_by_name} · {new Date(contact.scanned_at).toLocaleDateString('fr-FR')}
            </p>
          </div>
        </div>

        <div className="flex gap-2 mb-4">
          <Badge variant={contact.source === 'scan_carte' ? 'accent' : 'primary'}>
            {contact.source === 'scan_carte' ? 'Scan' : 'Manuel'}
          </Badge>
          {!contact.axonaut_synced && <Badge variant="orange">Axonaut non sync</Badge>}
        </div>

        {/* Card image - always visible */}
        {contact.card_image_url ? (
          <>
            <div
              className="w-full max-h-[200px] rounded-2xl overflow-hidden border-[1.5px] border-gray-200 mb-6 cursor-pointer shadow-card"
              onClick={() => setImageFullscreen(true)}
            >
              <img src={contact.card_image_url} alt="Carte de visite" className="w-full h-full object-contain bg-gray-50" />
            </div>
            {imageFullscreen && (
              <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={() => setImageFullscreen(false)}>
                <img src={contact.card_image_url} alt="Carte de visite" className="max-w-full max-h-full object-contain" />
              </div>
            )}
          </>
        ) : (
          <div className="w-full h-[120px] rounded-2xl border-[1.5px] border-dashed border-gray-300 mb-6 flex items-center justify-center bg-gray-50">
            <div className="text-center text-gray-400">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto mb-1">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <path d="M21 15l-5-5L5 21" />
              </svg>
              <p className="text-sm">Aucune image disponible</p>
            </div>
          </div>
        )}

        {/* Fields */}
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Prénom" value={contact.prenom} onChange={(e) => updateField('prenom', e.target.value)} />
            <Input label="Nom" value={contact.nom} onChange={(e) => updateField('nom', e.target.value)} />
          </div>
          <Input label="Société" value={contact.societe} onChange={(e) => updateField('societe', e.target.value)} />
          <Input label="Poste" value={contact.poste} onChange={(e) => updateField('poste', e.target.value)} />
          <Input label="Email" type="email" value={contact.email} onChange={(e) => updateField('email', e.target.value)} />
          <Input label="Téléphone" type="tel" value={contact.telephone} onChange={(e) => updateField('telephone', e.target.value)} />
          <Input label="Téléphone 2" type="tel" value={contact.telephone_2} onChange={(e) => updateField('telephone_2', e.target.value)} />
          <Input label="Adresse" value={contact.adresse} onChange={(e) => updateField('adresse', e.target.value)} />
          <Input label="Site web" type="url" value={contact.site_web} onChange={(e) => updateField('site_web', e.target.value)} />
          <Input label="LinkedIn" value={contact.linkedin} onChange={(e) => updateField('linkedin', e.target.value)} />

          <div className="mt-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Note</label>
            <textarea
              value={contact.note}
              onChange={(e) => updateField('note', e.target.value)}
              placeholder="Notes..."
              className="w-full px-4 py-3 min-h-[100px] border-[1.5px] border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary resize-y"
            />
          </div>

          {/* Tasks */}
          <div className="mt-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-primary">Tâches</h3>
              <Button variant="outline" size="sm" onClick={() => setShowTaskForm(true)}>
                + Ajouter
              </Button>
            </div>

            {contact.tasks.length > 0 ? (
              <div className="flex flex-col gap-2">
                {contact.tasks.map((task, i) => (
                  <div key={task._id} className="flex items-center gap-3 p-3 bg-white rounded-xl shadow-card border border-gray-100">
                    <button
                      onClick={() => toggleTaskDone(i)}
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                        task.done ? 'bg-green-500 border-green-500' : 'border-gray-300'
                      }`}
                    >
                      {task.done && (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                          <path d="M20 6L9 17l-5-5" />
                        </svg>
                      )}
                    </button>
                    <div className={`flex-1 ${task.done ? 'line-through text-gray-400' : ''}`}>
                      <p className="text-sm font-medium">{task.description}</p>
                      <p className="text-xs text-gray-500">
                        {task.type}
                        {task.due_date && ` · ${new Date(task.due_date).toLocaleDateString('fr-FR')}`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400">Aucune tâche</p>
            )}
          </div>

          <Button variant="primary" size="lg" fullWidth className="mt-6 shadow-btn" onClick={handleSave} disabled={saving}>
            {saving ? 'Sauvegarde...' : 'Sauvegarder'}
          </Button>

          {/* Axonaut button - disabled v0.1 */}
          <div className="relative mt-2">
            <Button variant="outline" size="md" fullWidth disabled className="opacity-50">
              Synchroniser avec Axonaut
            </Button>
            <p className="text-xs text-center text-secondary mt-1">Disponible en v0.2</p>
          </div>

          {/* Delete button */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="w-full flex items-center justify-center gap-2 py-3 min-h-[48px] text-red-600 hover:bg-red-50 rounded-xl transition-colors font-medium"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <polyline points="3,6 5,6 21,6" />
                <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                <line x1="10" y1="11" x2="10" y2="17" />
                <line x1="14" y1="11" x2="14" y2="17" />
              </svg>
              Supprimer ce contact
            </button>
          </div>
        </div>
      </div>

      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowDeleteConfirm(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-primary mb-2">Supprimer ce contact ?</h3>
            <p className="text-sm text-secondary mb-6">
              Cette action est irréversible. Le contact <strong>{contact.prenom} {contact.nom}</strong> sera définitivement supprimé.
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                size="md"
                fullWidth
                onClick={() => setShowDeleteConfirm(false)}
              >
                Annuler
              </Button>
              <button
                onClick={async () => {
                  setDeleting(true)
                  try {
                    const token = localStorage.getItem('token')
                    const res = await fetch(`/api/contacts/${id}`, {
                      method: 'DELETE',
                      headers: { Authorization: `Bearer ${token}` },
                    })
                    if (!res.ok) throw new Error('Erreur')
                    router.push('/contacts')
                  } catch {
                    setShowDeleteConfirm(false)
                    setToast({ message: 'Erreur lors de la suppression', type: 'error' })
                  } finally {
                    setDeleting(false)
                  }
                }}
                disabled={deleting}
                className="flex-1 py-3 min-h-[48px] bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {deleting ? 'Suppression...' : 'Supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}

      <TaskForm isOpen={showTaskForm} onClose={() => setShowTaskForm(false)} onAdd={addTask} />
    </div>
  )
}
