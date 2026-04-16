'use client'

import { useEffect, useRef, useState } from 'react'
import Modal from './ui/Modal'
import Input from './ui/Input'
import Button from './ui/Button'

interface LocalResult {
  _id: string
  prenom: string
  nom: string
  societe: string
  email: string
  axonaut_company_id?: string
  axonaut_synced?: boolean
  source: 'local'
}

interface AxoEmployeeResult {
  id: number
  firstname: string
  lastname: string
  email: string
  company_id: number
  source: 'axonaut-employee'
}

interface AxoCompanyResult {
  id: number
  name: string
  is_prospect: boolean
  is_customer: boolean
  source: 'axonaut-company'
}

type Selection =
  | { kind: 'local'; contactId: string; label: string; axonautCompanyId?: string; axonautSynced?: boolean }
  | { kind: 'axonaut-employee'; employeeId: number; companyId: number; label: string }
  | { kind: 'axonaut-company'; companyId: number; label: string }

interface NewTaskModalProps {
  isOpen: boolean
  onClose: () => void
  onCreated: () => void
}

const TASK_TYPES = [
  { value: 'rappel', label: 'Rappel' },
  { value: 'email', label: 'Email' },
  { value: 'reunion', label: 'Réunion' },
  { value: 'devis', label: 'Devis' },
  { value: 'autre', label: 'Autre' },
]

export default function NewTaskModal({ isOpen, onClose, onCreated }: NewTaskModalProps) {
  const [step, setStep] = useState<'search' | 'task'>('search')
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [locals, setLocals] = useState<LocalResult[]>([])
  const [axoEmployees, setAxoEmployees] = useState<AxoEmployeeResult[]>([])
  const [axoCompanies, setAxoCompanies] = useState<AxoCompanyResult[]>([])

  const [selection, setSelection] = useState<Selection | null>(null)

  const [description, setDescription] = useState('')
  const [type, setType] = useState('rappel')
  const [date, setDate] = useState('')
  const [includeTime, setIncludeTime] = useState(false)
  const [time, setTime] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const isMeeting = type === 'reunion'

  // Pour une réunion, l'heure est obligatoire → on force l'affichage du champ heure
  useEffect(() => {
    if (isMeeting) setIncludeTime(true)
  }, [isMeeting])

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!isOpen) return
    // Reset state à l'ouverture
    setStep('search')
    setQuery('')
    setLocals([])
    setAxoEmployees([])
    setAxoCompanies([])
    setSelection(null)
    setDescription('')
    setType('rappel')
    setDate('')
    setIncludeTime(false)
    setTime('')
    setError('')
  }, [isOpen])

  useEffect(() => {
    if (!isOpen || step !== 'search') return
    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (query.trim().length < 2) {
      setLocals([])
      setAxoEmployees([])
      setAxoCompanies([])
      return
    }

    debounceRef.current = setTimeout(async () => {
      await runSearch(query.trim())
    }, 350)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, isOpen, step])

  const runSearch = async (q: string) => {
    setLoading(true)
    setError('')
    try {
      const token = localStorage.getItem('token')
      const [localRes, axoRes] = await Promise.all([
        fetch(`/api/contacts?limit=100`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/axonaut/search?q=${encodeURIComponent(q)}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ])

      if (localRes.ok) {
        const { contacts } = await localRes.json()
        const ql = q.toLowerCase()
        const filtered: LocalResult[] = (contacts || [])
          .filter((c: any) =>
            [c.prenom, c.nom, c.societe, c.email]
              .filter(Boolean)
              .some((v: string) => v.toLowerCase().includes(ql))
          )
          .slice(0, 5)
          .map((c: any) => ({
            _id: c._id,
            prenom: c.prenom,
            nom: c.nom,
            societe: c.societe,
            email: c.email,
            axonaut_company_id: c.axonaut_company_id,
            axonaut_synced: c.axonaut_synced,
            source: 'local',
          }))
        setLocals(filtered)
      }

      if (axoRes.ok) {
        const { employees, companies } = await axoRes.json()
        setAxoEmployees(
          (employees || []).slice(0, 5).map((e: any) => ({ ...e, source: 'axonaut-employee' }))
        )
        setAxoCompanies(
          (companies || []).slice(0, 5).map((c: any) => ({ ...c, source: 'axonaut-company' }))
        )
      }
    } catch {
      setError('Erreur de recherche')
    } finally {
      setLoading(false)
    }
  }

  const pickLocal = (r: LocalResult) => {
    setSelection({
      kind: 'local',
      contactId: r._id,
      label: `${r.prenom} ${r.nom}`.trim() + (r.societe ? ` · ${r.societe}` : ''),
      axonautCompanyId: r.axonaut_company_id,
      axonautSynced: r.axonaut_synced,
    })
    setStep('task')
  }
  const pickAxoEmployee = (r: AxoEmployeeResult) => {
    setSelection({
      kind: 'axonaut-employee',
      employeeId: r.id,
      companyId: r.company_id,
      label: `${r.firstname} ${r.lastname}`.trim() + (r.email ? ` · ${r.email}` : ''),
    })
    setStep('task')
  }
  const pickAxoCompany = (r: AxoCompanyResult) => {
    setSelection({
      kind: 'axonaut-company',
      companyId: r.id,
      label: r.name,
    })
    setStep('task')
  }

  const submit = async () => {
    if (!selection) return
    if (!description.trim()) {
      setError('Description requise')
      return
    }
    if (isMeeting) {
      if (!date) {
        setError('La date est obligatoire pour une réunion')
        return
      }
      if (!time) {
        setError('L\'heure est obligatoire pour une réunion')
        return
      }
    }
    setSubmitting(true)
    setError('')
    try {
      const token = localStorage.getItem('token')
      const dueDate =
        date && (includeTime || isMeeting) && time ? `${date}T${time}` : date || null

      // 1. Résoudre le contact local (créer un shell si nécessaire)
      let localContactId: string
      let axonautCompanyId: string | undefined

      if (selection.kind === 'local') {
        localContactId = selection.contactId
        axonautCompanyId = selection.axonautCompanyId
      } else {
        // Créer un shell contact depuis Axonaut
        const body =
          selection.kind === 'axonaut-employee'
            ? { employeeId: selection.employeeId, companyId: selection.companyId }
            : { companyId: selection.companyId }
        const res = await fetch('/api/contacts/from-axonaut', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(body),
        })
        if (!res.ok) {
          const d = await res.json().catch(() => ({}))
          throw new Error(d.error || 'Erreur création contact')
        }
        const { contact } = await res.json()
        localContactId = contact._id
        axonautCompanyId = contact.axonaut_company_id
      }

      // 2. Ajouter la tâche au contact local
      const getRes = await fetch(`/api/contacts/${localContactId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!getRes.ok) throw new Error('Contact introuvable')
      const contact = await getRes.json()
      const newTask = {
        _id: Date.now().toString(),
        description: description.trim(),
        type,
        due_date: dueDate || new Date().toISOString(),
        done: false,
      }
      const updatedTasks = [...(contact.tasks || []), newTask]

      const putRes = await fetch(`/api/contacts/${localContactId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ tasks: updatedTasks }),
      })
      if (!putRes.ok) throw new Error('Erreur sauvegarde tâche')

      // 3. Sync Axonaut si possible
      if (axonautCompanyId) {
        try {
          await fetch('/api/axonaut/tasks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({
              companyId: Number(axonautCompanyId),
              title: description.trim(),
              dueDate: dueDate || undefined,
              type,
            }),
          })
        } catch {
          // non bloquant
        }
      }

      onCreated()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur')
    } finally {
      setSubmitting(false)
    }
  }

  const backToSearch = () => {
    setStep('search')
    setError('')
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={step === 'search' ? 'Nouvelle tâche — choisir le contact' : 'Nouvelle tâche'}>
      {step === 'search' ? (
        <div className="flex flex-col gap-3 py-1">
          <div className="relative">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2"
                 className="absolute left-3 top-1/2 -translate-y-1/2">
              <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
            </svg>
            <input
              autoFocus
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Nom, société, email…"
              className="w-full pl-10 pr-3 h-11 border border-line rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
            {loading && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <div className="w-4 h-4 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
              </div>
            )}
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          {query.length >= 2 && (
            <div className="flex flex-col gap-3 max-h-[50vh] overflow-y-auto">
              {locals.length > 0 && (
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted mb-1.5">
                    Mes contacts
                  </p>
                  <div className="flex flex-col gap-1">
                    {locals.map((r) => (
                      <button key={r._id} onClick={() => pickLocal(r)}
                        className="flex items-center gap-3 p-2.5 rounded-xl border border-line hover:border-primary/40 hover:bg-surface-2 text-left">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold flex-shrink-0">
                          {(r.prenom?.[0] || '') + (r.nom?.[0] || '')}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-ink truncate">{r.prenom} {r.nom}</p>
                          <p className="text-[11px] text-ink-muted truncate">{r.societe || r.email}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {axoEmployees.length > 0 && (
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted mb-1.5">
                    Contacts Axonaut
                  </p>
                  <div className="flex flex-col gap-1">
                    {axoEmployees.map((r) => (
                      <button key={`e-${r.id}`} onClick={() => pickAxoEmployee(r)}
                        className="flex items-center gap-3 p-2.5 rounded-xl border border-line hover:border-primary/40 hover:bg-surface-2 text-left">
                        <div className="w-8 h-8 rounded-full bg-action-soft flex items-center justify-center text-action text-xs font-bold flex-shrink-0">
                          {(r.firstname?.[0] || '') + (r.lastname?.[0] || '')}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-ink truncate">{r.firstname} {r.lastname}</p>
                          <p className="text-[11px] text-ink-muted truncate">{r.email}</p>
                        </div>
                        <span className="text-[9px] text-ink-muted bg-surface-2 px-1.5 py-0.5 rounded-full">Axonaut</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {axoCompanies.length > 0 && (
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted mb-1.5">
                    Entreprises Axonaut
                  </p>
                  <div className="flex flex-col gap-1">
                    {axoCompanies.map((r) => (
                      <button key={`c-${r.id}`} onClick={() => pickAxoCompany(r)}
                        className="flex items-center gap-3 p-2.5 rounded-xl border border-line hover:border-primary/40 hover:bg-surface-2 text-left">
                        <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1B2B6B" strokeWidth="1.5">
                            <path d="M3 21h18M3 7v14M21 7v14M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-ink truncate">{r.name}</p>
                          <p className="text-[11px] text-ink-muted">
                            {r.is_customer ? 'Client' : r.is_prospect ? 'Prospect' : 'Entreprise'}
                          </p>
                        </div>
                        <span className="text-[9px] text-ink-muted bg-surface-2 px-1.5 py-0.5 rounded-full">Axonaut</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {!loading && locals.length === 0 && axoEmployees.length === 0 && axoCompanies.length === 0 && (
                <p className="text-sm text-ink-muted text-center py-4">Aucun contact trouvé.</p>
              )}
            </div>
          )}

          {query.length < 2 && (
            <p className="text-xs text-ink-muted py-2">Tapez au moins 2 caractères pour rechercher dans vos contacts et Axonaut.</p>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-3 py-1">
          {/* Contact sélectionné */}
          <div className="bg-surface-2 rounded-xl p-3 flex items-center justify-between gap-2">
            <p className="text-sm text-ink truncate">{selection?.label}</p>
            <button onClick={backToSearch} className="text-xs text-primary underline whitespace-nowrap flex-shrink-0">
              Changer
            </button>
          </div>

          <Input label="Description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ex: Rappeler demain matin" />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select value={type} onChange={(e) => setType(e.target.value)}
              className="w-full px-4 py-3 min-h-[48px] border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent">
              {TASK_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          <div className={`grid gap-3 ${includeTime || isMeeting ? 'grid-cols-2' : 'grid-cols-1'}`}>
            <Input label={`Date${isMeeting ? ' *' : ''}`} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            {(includeTime || isMeeting) && (
              <Input label={`Heure${isMeeting ? ' *' : ''}`} type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            )}
          </div>
          {!isMeeting ? (
            <label className="flex items-center gap-2 cursor-pointer select-none -mt-1">
              <input type="checkbox" checked={includeTime} onChange={(e) => { setIncludeTime(e.target.checked); if (!e.target.checked) setTime('') }}
                className="w-4 h-4 accent-primary rounded" />
              <span className="text-sm text-gray-700">Ajouter une heure précise</span>
            </label>
          ) : (
            <p className="text-xs text-ink-muted -mt-1">
              Date et heure obligatoires pour une réunion (remontera dans la chronologie Axonaut).
            </p>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-2 mt-1">
            <Button variant="outline" size="md" onClick={onClose} disabled={submitting} fullWidth>
              Annuler
            </Button>
            <Button variant="primary" size="md" onClick={submit} disabled={submitting || !description.trim()} fullWidth>
              {submitting ? 'Création…' : 'Créer la tâche'}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}
