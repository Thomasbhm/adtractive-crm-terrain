'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import Toast from '@/components/ui/Toast'
import Modal from '@/components/ui/Modal'
import VoiceNote from '@/components/VoiceNote'
import TaskForm, { TaskData } from '@/components/TaskForm'
import { formatTaskDueDate } from '@/lib/dates'

interface LocalTask {
  _id: string
  description: string
  due_date: string
  type: string
  done: boolean
}

interface LocalContact {
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
  axonaut_company_id?: string
  axonaut_employee_id?: string
  axonaut_synced: boolean
  synced_at?: string
  tasks: LocalTask[]
  scanned_at: string
  scanned_by_name?: string
}

// Page pour les contacts locaux NON-SYNC avec Axonaut.
// Après synchronisation réussie, redirige vers la fiche entreprise Axonaut.
export default function LocalContactPage() {
  const router = useRouter()
  const params = useParams()
  const id = params?.id as string

  const [user, setUser] = useState<{ prenom: string; nom: string; role: string } | null>(null)
  const [contact, setContact] = useState<LocalContact | null>(null)
  const [loading, setLoading] = useState(true)
  const [editMode, setEditMode] = useState(false)
  const [edit, setEdit] = useState<Partial<LocalContact>>({})
  const [saving, setSaving] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [showTaskForm, setShowTaskForm] = useState(false)
  const [showVoice, setShowVoice] = useState(false)
  const [imageFullscreen, setImageFullscreen] = useState(false)
  const [imageError, setImageError] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) { router.replace('/login'); return }
    const stored = localStorage.getItem('user')
    if (stored) setUser(JSON.parse(stored))

    const fetchContact = async () => {
      try {
        const res = await fetch(`/api/contacts/${id}`, { headers: { Authorization: `Bearer ${token}` } })
        if (!res.ok) throw new Error()
        const c: LocalContact = await res.json()

        // Si déjà synchronisé, rediriger vers la fiche Axonaut
        if (c.axonaut_synced && c.axonaut_company_id) {
          router.replace(`/contacts/axonaut/company/${c.axonaut_company_id}`)
          return
        }
        setContact(c)
      } catch {
        setToast({ message: 'Contact non trouvé', type: 'error' })
      } finally {
        setLoading(false)
      }
    }
    if (id) fetchContact()
  }, [id, router])

  const enterEdit = () => { if (contact) { setEdit({ ...contact }); setEditMode(true) } }
  const cancelEdit = () => { setEditMode(false); setEdit({}) }

  const saveEdit = async () => {
    if (!contact) return
    setSaving(true)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`/api/contacts/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          prenom: edit.prenom, nom: edit.nom, societe: edit.societe, poste: edit.poste,
          email: edit.email, telephone: edit.telephone, telephone_2: edit.telephone_2,
          adresse: edit.adresse, site_web: edit.site_web, linkedin: edit.linkedin, note: edit.note,
        }),
      })
      if (!res.ok) throw new Error()
      const updated = await res.json()
      setContact(updated)
      setEditMode(false)
      setToast({ message: 'Modifications enregistrées', type: 'success' })
    } catch {
      setToast({ message: 'Erreur de sauvegarde', type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const syncToAxonaut = async () => {
    if (!contact) return
    setSyncing(true)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/axonaut/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ contactId: id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur sync')
      // Redirect vers la fiche Axonaut
      router.replace(`/contacts/axonaut/company/${data.axonaut_company_id}`)
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : 'Erreur de synchronisation', type: 'error' })
    } finally {
      setSyncing(false)
    }
  }

  const handleVoiceText = async (text: string) => {
    if (!contact) return
    const newNote = contact.note ? `${contact.note}\n${text}` : text
    try {
      const token = localStorage.getItem('token')
      await fetch(`/api/contacts/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ note: newNote }),
      })
      setContact({ ...contact, note: newNote })
      setShowVoice(false)
      setToast({ message: 'Note ajoutée', type: 'success' })
    } catch {
      setToast({ message: 'Erreur', type: 'error' })
    }
  }

  const addLocalTask = async (task: TaskData) => {
    if (!contact) return
    const updated = [
      ...contact.tasks,
      { _id: Date.now().toString(), description: task.description, type: task.type, due_date: task.due_date, done: false },
    ]
    try {
      const token = localStorage.getItem('token')
      await fetch(`/api/contacts/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ tasks: updated }),
      })
      setContact({ ...contact, tasks: updated })
      setShowTaskForm(false)
      setToast({ message: 'Tâche ajoutée', type: 'success' })
    } catch {
      setToast({ message: 'Erreur', type: 'error' })
    }
  }

  const toggleTaskDone = async (idx: number) => {
    if (!contact) return
    const updated = [...contact.tasks]
    updated[idx] = { ...updated[idx], done: !updated[idx].done }
    try {
      const token = localStorage.getItem('token')
      await fetch(`/api/contacts/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ tasks: updated }),
      })
      setContact({ ...contact, tasks: updated })
    } catch {}
  }

  const deleteContact = async () => {
    setDeleting(true)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`/api/contacts/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error()
      router.push('/contacts')
    } catch {
      setShowDelete(false)
      setToast({ message: 'Erreur de suppression', type: 'error' })
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-page">
        <Navbar prenom={user?.prenom} nom={user?.nom} role={user?.role} />
        <div className="p-8 flex justify-center"><div className="w-8 h-8 border-[3px] border-primary/20 border-t-primary rounded-full animate-spin" /></div>
      </div>
    )
  }

  if (!contact) {
    return (
      <div className="min-h-screen bg-page">
        <Navbar prenom={user?.prenom} nom={user?.nom} role={user?.role} />
        <div className="p-4">
          <button onClick={() => router.back()} className="text-primary font-medium">← Retour</button>
          <p className="mt-6 text-secondary">Contact introuvable.</p>
        </div>
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
          <button onClick={() => router.push('/contacts')} className="min-h-[48px] min-w-[48px] flex items-center justify-center" aria-label="Retour">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1B2B6B" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-primary truncate">{contact.societe || `${contact.prenom} ${contact.nom}`.trim() || 'Contact'}</h1>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">Non synchronisé</span>
              <span className="text-xs text-secondary">{contact.scanned_by_name}</span>
            </div>
          </div>
          {!editMode && (
            <button onClick={enterEdit}
              className="text-xs font-medium text-primary px-3 py-2 rounded-lg border border-primary/30 hover:bg-primary/5 whitespace-nowrap min-h-[40px]">
              Modifier
            </button>
          )}
        </div>

        {/* CTA Sync */}
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 mb-4">
          <p className="text-sm text-primary font-medium mb-2">Ce contact n&apos;est pas encore synchronisé avec Axonaut.</p>
          <p className="text-xs text-secondary mb-3">Synchronisez-le pour accéder à l&apos;historique des échanges (emails, appels, notes…) et aux devis/factures.</p>
          <Button variant="primary" size="md" fullWidth disabled={syncing} onClick={syncToAxonaut}>
            {syncing ? 'Synchronisation en cours…' : 'Synchroniser avec Axonaut'}
          </Button>
        </div>

        {/* Carte de visite */}
        {contact.card_image_url && !imageError && (
          <div className="bg-white rounded-xl p-3 shadow-card border border-gray-100 mb-4">
            <h2 className="text-xs font-semibold text-secondary uppercase tracking-wide mb-2">Carte de visite</h2>
            <div className="w-full max-h-[200px] rounded-xl overflow-hidden border border-gray-200 cursor-pointer" onClick={() => setImageFullscreen(true)}>
              <img src={contact.card_image_url} alt="Carte" className="w-full h-full object-contain bg-gray-50" onError={() => setImageError(true)} />
            </div>
            {imageFullscreen && (
              <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={() => setImageFullscreen(false)}>
                <img src={contact.card_image_url} alt="Carte" className="max-w-full max-h-full object-contain" />
              </div>
            )}
          </div>
        )}

        {/* Infos */}
        <div className="bg-white rounded-xl p-4 shadow-card border border-gray-100 mb-4">
          <h2 className="text-sm font-semibold text-primary uppercase tracking-wide mb-3">Contact</h2>
          {!editMode ? (
            <dl className="space-y-2 text-sm">
              <Row label="Prénom">{contact.prenom || '—'}</Row>
              <Row label="Nom">{contact.nom || '—'}</Row>
              <Row label="Société">{contact.societe || '—'}</Row>
              <Row label="Poste">{contact.poste || '—'}</Row>
              <Row label="Email">{contact.email ? <a href={`mailto:${contact.email}`} className="underline text-primary">{contact.email}</a> : '—'}</Row>
              <Row label="Téléphone">{contact.telephone ? <a href={`tel:${contact.telephone}`} className="underline text-primary">{contact.telephone}</a> : '—'}</Row>
              {contact.telephone_2 && <Row label="Tél. 2"><a href={`tel:${contact.telephone_2}`} className="underline text-primary">{contact.telephone_2}</a></Row>}
              {contact.adresse && <Row label="Adresse">{contact.adresse}</Row>}
              {contact.site_web && <Row label="Site"><a href={contact.site_web} target="_blank" rel="noopener noreferrer" className="underline text-primary break-all">{contact.site_web}</a></Row>}
              {contact.linkedin && <Row label="LinkedIn"><a href={contact.linkedin} target="_blank" rel="noopener noreferrer" className="underline text-primary break-all">{contact.linkedin}</a></Row>}
              {contact.note && <Row label="Note"><span className="whitespace-pre-wrap">{contact.note}</span></Row>}
            </dl>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-3">
                <Input label="Prénom" value={edit.prenom || ''} onChange={(e) => setEdit({ ...edit, prenom: e.target.value })} />
                <Input label="Nom" value={edit.nom || ''} onChange={(e) => setEdit({ ...edit, nom: e.target.value })} />
              </div>
              <Input label="Société" value={edit.societe || ''} onChange={(e) => setEdit({ ...edit, societe: e.target.value })} />
              <Input label="Poste" value={edit.poste || ''} onChange={(e) => setEdit({ ...edit, poste: e.target.value })} />
              <Input label="Email" type="email" value={edit.email || ''} onChange={(e) => setEdit({ ...edit, email: e.target.value })} />
              <Input label="Téléphone" type="tel" value={edit.telephone || ''} onChange={(e) => setEdit({ ...edit, telephone: e.target.value })} />
              <Input label="Téléphone 2" type="tel" value={edit.telephone_2 || ''} onChange={(e) => setEdit({ ...edit, telephone_2: e.target.value })} />
              <Input label="Adresse" value={edit.adresse || ''} onChange={(e) => setEdit({ ...edit, adresse: e.target.value })} />
              <Input label="Site web" value={edit.site_web || ''} onChange={(e) => setEdit({ ...edit, site_web: e.target.value })} />
              <Input label="LinkedIn" value={edit.linkedin || ''} onChange={(e) => setEdit({ ...edit, linkedin: e.target.value })} />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Note</label>
                <textarea value={edit.note || ''} onChange={(e) => setEdit({ ...edit, note: e.target.value })}
                  className="w-full px-4 py-3 min-h-[100px] border-[1.5px] border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary resize-y" />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="md" onClick={cancelEdit} fullWidth>Annuler</Button>
                <Button variant="primary" size="md" onClick={saveEdit} disabled={saving} fullWidth>{saving ? 'Sauvegarde…' : 'Enregistrer'}</Button>
              </div>
            </div>
          )}
        </div>

        {/* Note vocale */}
        {!editMode && (
          <button onClick={() => setShowVoice(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 mb-3 min-h-[48px] border-[1.5px] border-primary text-primary font-medium rounded-full hover:bg-primary/5 transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" /><path d="M19 10v2a7 7 0 01-14 0v-2" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /><line x1="12" y1="19" x2="12" y2="23" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /><line x1="8" y1="23" x2="16" y2="23" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
            Ajouter une note vocale
          </button>
        )}

        {/* Tâches */}
        <div className="bg-white rounded-xl p-4 shadow-card border border-gray-100 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-primary uppercase tracking-wide">Tâches ({contact.tasks.length})</h2>
            <Button variant="outline" size="sm" onClick={() => setShowTaskForm(true)}>+ Ajouter</Button>
          </div>
          {contact.tasks.length === 0 ? (
            <p className="text-sm text-secondary">Aucune tâche.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {contact.tasks.map((task, i) => (
                <div key={task._id} className="flex items-center gap-3 p-3 rounded-lg border border-gray-100">
                  <button onClick={() => toggleTaskDone(i)}
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${task.done ? 'bg-green-500 border-green-500' : 'border-gray-300'}`}>
                    {task.done && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><path d="M20 6L9 17l-5-5" /></svg>}
                  </button>
                  <div className={`flex-1 ${task.done ? 'line-through text-gray-400' : ''}`}>
                    <p className="text-sm font-medium">{task.description}</p>
                    <p className="text-xs text-gray-500">{task.type}{task.due_date && ` · ${formatTaskDueDate(task.due_date)}`}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Supprimer */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <button onClick={() => setShowDelete(true)}
            className="w-full flex items-center justify-center gap-2 py-3 min-h-[48px] text-red-600 hover:bg-red-50 rounded-xl transition-colors font-medium">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <polyline points="3,6 5,6 21,6" /><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" />
            </svg>
            Supprimer ce contact
          </button>
        </div>
      </div>

      {/* Modales */}
      <TaskForm isOpen={showTaskForm} onClose={() => setShowTaskForm(false)} onAdd={addLocalTask} />
      <Modal isOpen={showVoice} onClose={() => setShowVoice(false)} title="Note vocale">
        <div className="py-4"><VoiceNote onTextReady={handleVoiceText} /></div>
      </Modal>

      {showDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowDelete(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-primary mb-2">Supprimer ce contact ?</h3>
            <p className="text-sm text-secondary mb-4">
              Cette action est irréversible. <strong>{contact.prenom} {contact.nom}</strong> sera définitivement supprimé.
            </p>
            <div className="flex flex-col gap-3">
              <button onClick={deleteContact} disabled={deleting}
                className="w-full px-6 py-3 min-h-[48px] bg-red-600 text-white font-semibold rounded-full hover:bg-red-700 disabled:opacity-50">
                {deleting ? 'Suppression…' : 'Supprimer'}
              </button>
              <Button variant="outline" size="md" fullWidth onClick={() => setShowDelete(false)}>Annuler</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:gap-3">
      <dt className="text-xs text-secondary uppercase tracking-wide sm:w-28 sm:flex-shrink-0 pt-0.5">{label}</dt>
      <dd className="text-sm text-gray-900">{children}</dd>
    </div>
  )
}
