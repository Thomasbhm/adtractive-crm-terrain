'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import DOMPurify from 'isomorphic-dompurify'
import { formatTaskDueDate } from '@/lib/dates'
import Navbar from '@/components/Navbar'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import Toast from '@/components/ui/Toast'
import Modal from '@/components/ui/Modal'
import VoiceNote from '@/components/VoiceNote'
import TaskForm, { TaskData } from '@/components/TaskForm'

// ─── Types Axonaut ────────────────────────────────────────────────────────────
interface Employee {
  id: number
  firstname?: string
  lastname?: string
  email?: string
  phone_number?: string
  cellphone_number?: string
  job?: string
}

interface Event {
  id: number
  title?: string
  content?: string
  date?: string
  timestamp?: number
  nature?: string | number
  duration?: number
  users?: Array<{ email?: string; fullname?: string }>
  employees?: Array<{ email?: string; fullname?: string }>
  attachments?: any
}

interface Quotation {
  id: number
  number?: string
  title?: string
  date?: any
  status?: string
  total_amount?: number
  pre_tax_amount?: number
  public_path?: string
}

interface Invoice {
  id: number
  number?: string
  date?: any
  total?: number
  currency?: string
  paid_date?: any
  outstanding_amount?: number
  public_path?: string
}

interface Opportunity {
  id: number
  name?: string
  amount?: number
  probability?: number
  is_win?: boolean
  is_archived?: boolean
  pipe_name?: string
  pipe_step_name?: string
  creation_date?: any
  due_date?: any
}

interface Company {
  id: number
  name?: string
  address_street?: string
  address_zip_code?: string
  address_city?: string
  address_country?: string
  comments?: string
  is_prospect?: boolean
  is_customer?: boolean
  siret?: string
  intracommunity_number?: string
  currency?: string
  business_manager?: { name?: string; email?: string }
  categories?: any
}

interface AxonautPayload {
  company: Company
  employees: Employee[]
  events: Event[]
  quotations: Quotation[]
  invoices: Invoice[]
  opportunities: Opportunity[]
}

// ─── Types CRM local ──────────────────────────────────────────────────────────
interface LocalTask {
  _id: string
  description: string
  due_date: string
  type: string
  done: boolean
  axonaut_task_id?: string
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
  tasks: LocalTask[]
  scanned_at: string
}

type Tab = 'info' | 'history' | 'business'

const EVENT_TYPE_OPTIONS: Array<{ key: string; label: string; icon: string }> = [
  { key: 'note',    label: 'Note',    icon: '📝' },
  { key: 'email',   label: 'Email',   icon: '📧' },
  { key: 'call',    label: 'Appel',   icon: '📞' },
  { key: 'meeting', label: 'Réunion', icon: '👥' },
]

// ─── Utils ────────────────────────────────────────────────────────────────────

function normalizeNature(n: string | number | undefined): {
  key: 'email' | 'call' | 'note' | 'meeting' | 'mail' | 'sms' | 'other'
  label: string
  icon: string
} {
  const s = typeof n === 'string' ? n.toLowerCase() : String(n ?? '')
  if (s === '2' || s.includes('email') || s.includes('mail ')) return { key: 'email', label: 'Email', icon: '📧' }
  if (s === '3' || s.includes('call') || s.includes('phone') || s.includes('appel') || s.includes('téléphon')) return { key: 'call', label: 'Appel', icon: '📞' }
  if (s === '6' || s.includes('note')) return { key: 'note', label: 'Note', icon: '📝' }
  if (s === '1' || s.includes('meeting') || s.includes('réunion')) return { key: 'meeting', label: 'Réunion', icon: '👥' }
  if (s === '4' || s.includes('courrier') || s.includes('letter')) return { key: 'mail', label: 'Courrier', icon: '📨' }
  if (s === '5' || s.includes('sms')) return { key: 'sms', label: 'SMS', icon: '💬' }
  return { key: 'other', label: typeof n === 'string' ? n : 'Autre', icon: '•' }
}

function formatDate(value: any): string {
  if (!value) return '—'
  let ts: number
  if (typeof value === 'number') {
    ts = value > 1e12 ? value : value * 1000
  } else if (typeof value === 'string') {
    ts = /^\d+$/.test(value)
      ? Number(value) > 1e12 ? Number(value) : Number(value) * 1000
      : Date.parse(value)
  } else {
    return '—'
  }
  if (Number.isNaN(ts) || !ts) return '—'
  return new Date(ts).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function formatAmount(n: number | undefined, currency = 'EUR'): string {
  if (n === undefined || n === null) return '—'
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency, maximumFractionDigits: 0 }).format(n)
}

interface AttachmentLink { url: string; label: string }

function flattenAttachments(att: any): AttachmentLink[] {
  if (!att || typeof att !== 'object') return []
  const out: AttachmentLink[] = []
  const pickUrl = (obj: any): string | null => {
    if (!obj || typeof obj !== 'object') return null
    return obj.public_path || obj.customer_portal_url || obj.download_url || obj.url || null
  }
  if (Array.isArray(att.invoices)) for (const it of att.invoices) {
    out.push({ url: pickUrl(it) || `https://axonaut.com/business/invoice/show/${it.id}`, label: `Facture ${it.number || it.id}` })
  }
  if (Array.isArray(att.quotations)) for (const it of att.quotations) {
    out.push({ url: pickUrl(it) || `https://axonaut.com/business/quotation/show/${it.id}`, label: `Devis ${it.number || it.id}` })
  }
  if (Array.isArray(att.documents)) for (const it of att.documents) {
    out.push({ url: pickUrl(it) || `https://axonaut.com/business/document/show/${it.id}`, label: it.name || it.filename || `Document ${it.id}` })
  }
  return out
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CompanyDetailPage() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const companyId = params?.companyId as string
  const highlightEmployeeId = searchParams.get('employee')

  const [user, setUser] = useState<{ prenom: string; nom: string; role: string } | null>(null)
  const [data, setData] = useState<AxonautPayload | null>(null)
  const [local, setLocal] = useState<LocalContact | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notFound, setNotFound] = useState(false)
  const [tab, setTab] = useState<Tab>('info')

  // Edit mode
  const [editMode, setEditMode] = useState(false)
  const [editData, setEditData] = useState<Partial<LocalContact> | null>(null)
  const [saving, setSaving] = useState(false)

  // Add event / task
  const [showEventMenu, setShowEventMenu] = useState(false)
  const [addEventType, setAddEventType] = useState<string | null>(null)
  const [addingEvent, setAddingEvent] = useState(false)
  const [eventTitle, setEventTitle] = useState('')
  const [eventContent, setEventContent] = useState('')
  const [eventDuration, setEventDuration] = useState('')
  const [showTaskForm, setShowTaskForm] = useState(false)

  // Filtre historique
  const [historyFilter, setHistoryFilter] = useState<'all' | 'email' | 'call' | 'note' | 'meeting' | 'other'>('all')

  // Feedback
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [imageFullscreen, setImageFullscreen] = useState(false)
  const [imageError, setImageError] = useState(false)

  const reload = async (token: string) => {
    const [detailRes, localRes] = await Promise.all([
      fetch(`/api/axonaut/company-detail/${companyId}?_=${Date.now()}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      }),
      fetch(`/api/contacts/by-company/${companyId}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      }).catch(() => null),
    ])

    if (!detailRes.ok) {
      const d = await detailRes.json().catch(() => ({}))
      const msg = typeof d.error === 'string' ? d.error : typeof d.message === 'string' ? d.message : `Erreur ${detailRes.status}`
      if (/404/.test(msg) || /not found/i.test(msg)) {
        setNotFound(true)
        return
      }
      throw new Error(msg)
    }
    const detail: AxonautPayload = await detailRes.json()
    setData(detail)

    if (localRes && localRes.ok) {
      const { contact } = await localRes.json()
      setLocal(contact)
    }
  }

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      router.replace('/login')
      return
    }
    const stored = localStorage.getItem('user')
    if (stored) setUser(JSON.parse(stored))

    const load = async () => {
      try {
        await reload(token)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Impossible de charger la fiche')
      } finally {
        setLoading(false)
      }
    }
    if (companyId) load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId, router])

  // ─── Edit mode ─────────────────────────────────────────────────────────────
  const enterEdit = () => {
    if (!local) return
    setEditData({ ...local })
    setEditMode(true)
  }

  const cancelEdit = () => {
    setEditMode(false)
    setEditData(null)
  }

  const saveEdit = async () => {
    if (!local || !editData) return
    setSaving(true)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`/api/contacts/${local._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          prenom: editData.prenom,
          nom: editData.nom,
          societe: editData.societe,
          poste: editData.poste,
          email: editData.email,
          telephone: editData.telephone,
          telephone_2: editData.telephone_2,
          adresse: editData.adresse,
          site_web: editData.site_web,
          linkedin: editData.linkedin,
          note: editData.note,
        }),
      })
      if (!res.ok) throw new Error()
      const updated = await res.json()
      setLocal(updated)
      setEditMode(false)
      setEditData(null)
      setToast({ message: 'Modifications enregistrées', type: 'success' })
    } catch {
      setToast({ message: 'Erreur lors de la sauvegarde', type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  // ─── Ajout d'événements (sync Axonaut) ─────────────────────────────────────
  // Helper générique qui accepte des overrides pour le flow vocal (auto-submit)
  const postEvent = async (opts: { type: string; content: string; title?: string; duration?: string }) => {
    if (!data?.company?.id) throw new Error('Aucune entreprise')
    const token = localStorage.getItem('token')
    const res = await fetch('/api/axonaut/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        companyId: data.company.id,
        type: opts.type,
        title: opts.title || undefined,
        content: opts.content,
        duration: opts.duration ? Number(opts.duration) : undefined,
      }),
    })
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      throw new Error(d.error || 'Erreur Axonaut')
    }
    return token
  }

  // Ajoute optimiste l'event au state local
  const addOptimisticEvent = (type: string, content: string, title?: string) => {
    setData((prev) => {
      if (!prev) return prev
      const fakeEvent: Event = {
        id: Date.now(), // ID temporaire négatif pour éviter collision avec Axonaut
        title,
        content,
        date: new Date().toISOString(),
        timestamp: Math.floor(Date.now() / 1000),
        nature: type === 'call' ? 'phone' : type, // mappe au string Axonaut
        users: user ? [{ fullname: `${user.prenom} ${user.nom}` }] : [],
      }
      return { ...prev, events: [fakeEvent, ...prev.events] }
    })
  }

  // Reload en 2 passes pour rattraper le délai d'indexation Axonaut
  const reloadWithRetry = (token: string) => {
    setTimeout(() => { reload(token).catch(() => {}) }, 1500)
    setTimeout(() => { reload(token).catch(() => {}) }, 5000)
  }

  const submitEvent = async () => {
    if (!data?.company?.id) return
    if (!eventContent.trim()) {
      setToast({ message: 'Contenu requis', type: 'error' })
      return
    }
    setAddingEvent(true)
    try {
      const type = addEventType === 'voice' ? 'note' : addEventType!
      const token = await postEvent({
        type,
        content: eventContent,
        title: eventTitle,
        duration: eventDuration,
      })

      addOptimisticEvent(type, eventContent, eventTitle || undefined)

      // Si note et contact local → sync aussi localement
      if (local && type === 'note') {
        const newNote = local.note ? `${local.note}\n${eventContent}` : eventContent
        try {
          await fetch(`/api/contacts/${local._id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ note: newNote }),
          })
          setLocal({ ...local, note: newNote })
        } catch {}
      }

      setAddEventType(null)
      setEventTitle('')
      setEventContent('')
      setEventDuration('')
      setToast({ message: 'Événement ajouté dans Axonaut', type: 'success' })
      reloadWithRetry(token!)
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : 'Erreur', type: 'error' })
    } finally {
      setAddingEvent(false)
    }
  }

  // Pour la note vocale : envoi direct dès que transcription prête
  const handleVoiceTranscription = async (text: string) => {
    if (!text.trim()) return
    if (addEventType !== 'voice') {
      // Fallback : injection dans le champ contenu
      setEventContent((prev) => (prev ? `${prev}\n${text}` : text))
      return
    }
    setAddingEvent(true)
    try {
      const token = await postEvent({ type: 'note', content: text, title: eventTitle || undefined })

      addOptimisticEvent('note', text, eventTitle || undefined)

      // Sync local si contact local présent
      if (local) {
        const newNote = local.note ? `${local.note}\n${text}` : text
        try {
          await fetch(`/api/contacts/${local._id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ note: newNote }),
          })
          setLocal({ ...local, note: newNote })
        } catch {}
      }

      setAddEventType(null)
      setEventTitle('')
      setEventContent('')
      setToast({ message: 'Note vocale ajoutée dans Axonaut', type: 'success' })
      // Auto-passage à l'onglet Historique pour voir le résultat
      setTab('history')
      setHistoryFilter('note')
      reloadWithRetry(token!)
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : 'Erreur', type: 'error' })
    } finally {
      setAddingEvent(false)
    }
  }

  // Refresh manuel
  const manualRefresh = async () => {
    const token = localStorage.getItem('token')
    if (!token) return
    try {
      await reload(token)
      setToast({ message: 'Actualisé', type: 'success' })
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : 'Erreur', type: 'error' })
    }
  }

  const addAxonautTask = async (task: TaskData) => {
    if (!data?.company?.id) return
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/axonaut/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          companyId: data.company.id,
          title: task.description,
          dueDate: task.due_date,
          type: task.type,
        }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error || 'Erreur Axonaut')
      }
      // Ajouter aussi localement si contact local présent
      if (local) {
        try {
          const updatedTasks = [
            ...local.tasks,
            {
              _id: Date.now().toString(),
              description: task.description,
              type: task.type,
              due_date: task.due_date,
              done: false,
            },
          ]
          await fetch(`/api/contacts/${local._id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ tasks: updatedTasks }),
          })
          setLocal({ ...local, tasks: updatedTasks })
        } catch {}
      }
      setShowTaskForm(false)
      setToast({ message: 'Tâche ajoutée dans Axonaut', type: 'success' })
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : 'Erreur', type: 'error' })
    }
  }

  const toggleLocalTaskDone = async (idx: number) => {
    if (!local) return
    const updated = [...local.tasks]
    updated[idx] = { ...updated[idx], done: !updated[idx].done }
    try {
      const token = localStorage.getItem('token')
      await fetch(`/api/contacts/${local._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ tasks: updated }),
      })
      setLocal({ ...local, tasks: updated })
    } catch {
      setToast({ message: 'Erreur', type: 'error' })
    }
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-page">
        <Navbar prenom={user?.prenom} nom={user?.nom} role={user?.role} />
        <div className="p-8 flex items-center justify-center">
          <div className="w-8 h-8 border-[3px] border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-page">
        <Navbar prenom={user?.prenom} nom={user?.nom} role={user?.role} />
        <div className="p-4 max-w-xl">
          <button onClick={() => router.back()} className="text-primary font-medium mb-4 min-h-[48px] flex items-center">← Retour</button>
          <div className="bg-white rounded-xl p-5 shadow-card border border-gray-100">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1B2B6B" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-bold text-primary text-lg">Accès restreint</h2>
                <p className="text-sm text-gray-700 mt-1">
                  Cette entreprise existe dans Axonaut, mais elle n&apos;est pas rattachée à votre compte (probablement gérée par un autre commercial). Votre clé API ne peut pas en récupérer le détail.
                </p>
                <a href={`https://axonaut.com/business/company/show/${companyId}`} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-primary text-white rounded-lg font-medium text-sm hover:bg-primary/90 min-h-[44px]">
                  Ouvrir dans Axonaut ↗
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-page">
        <Navbar prenom={user?.prenom} nom={user?.nom} role={user?.role} />
        <div className="p-4">
          <button onClick={() => router.back()} className="text-primary font-medium mb-4">← Retour</button>
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">{error || 'Entreprise introuvable'}</div>
        </div>
      </div>
    )
  }

  const { company, employees, events, quotations, invoices, opportunities } = data

  const grouped = { email: [] as Event[], call: [] as Event[], note: [] as Event[], meeting: [] as Event[], mail: [] as Event[], sms: [] as Event[], other: [] as Event[] }
  for (const ev of events) {
    const { key } = normalizeNature(ev.nature)
    grouped[key].push(ev)
  }

  const statusLabel = company.is_customer ? 'Client' : company.is_prospect ? 'Prospect' : 'Entreprise'
  const statusColor = company.is_customer ? 'bg-green-100 text-green-700' : company.is_prospect ? 'bg-accent/20 text-primary' : 'bg-gray-100 text-gray-700'

  const ed = editData || {}

  return (
    <div className="min-h-screen bg-page">
      <Navbar prenom={user?.prenom} nom={user?.nom} role={user?.role} />
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <style jsx global>{`
        .email-body a { color: #1B2B6B; text-decoration: underline; word-break: break-all; }
        .email-body img { max-width: 100%; height: auto; }
        .email-body table { max-width: 100%; }
        .email-body p, .email-body div { margin: 0 0 0.25rem 0; }
        .email-body blockquote { border-left: 2px solid #E5E7EB; padding-left: 0.75rem; color: #6B7280; margin: 0.25rem 0; }
        .email-body ul, .email-body ol { padding-left: 1.25rem; margin: 0.25rem 0; }
        .scrollbar-none { scrollbar-width: none; -ms-overflow-style: none; }
        .scrollbar-none::-webkit-scrollbar { display: none; }
      `}</style>

      <div className="p-4 pb-24">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => router.back()} className="min-h-[48px] min-w-[48px] flex items-center justify-center" aria-label="Retour">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1B2B6B" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-primary truncate">{company.name || '—'}</h1>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor}`}>{statusLabel}</span>
              {company.address_city && <span className="text-xs text-secondary">{company.address_city}</span>}
              {local && <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">CRM local</span>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {local && !editMode && (
              <button onClick={enterEdit}
                className="text-xs font-medium text-primary px-3 py-2 rounded-lg border border-primary/30 hover:bg-primary/5 whitespace-nowrap min-h-[40px]">
                Modifier
              </button>
            )}
            <a href={`https://axonaut.com/business/company/show/${company.id}`} target="_blank" rel="noopener noreferrer"
              className="text-xs text-primary font-medium px-3 py-2 rounded-lg border border-primary/20 hover:bg-primary/5 whitespace-nowrap min-h-[40px]">
              Axonaut ↗
            </a>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white rounded-xl p-1 mb-5 shadow-card border border-gray-100">
          {([{ key: 'info', label: 'Infos' }, { key: 'history', label: 'Historique' }, { key: 'business', label: 'Business' }] as const).map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t.key ? 'bg-primary text-white' : 'text-secondary hover:text-primary'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ─── Tab: INFOS ───────────────────────────────────────────────── */}
        {tab === 'info' && (
          <div className="space-y-4">
            {/* Carte de visite (si contact local) */}
            {local && local.card_image_url && !imageError && (
              <div className="bg-white rounded-xl p-3 shadow-card border border-gray-100">
                <h2 className="text-xs font-semibold text-secondary uppercase tracking-wide mb-2">Carte de visite</h2>
                <div className="w-full max-h-[200px] rounded-xl overflow-hidden border border-gray-200 cursor-pointer"
                  onClick={() => setImageFullscreen(true)}>
                  <img src={local.card_image_url} alt="Carte de visite" className="w-full h-full object-contain bg-gray-50"
                    onError={() => setImageError(true)} />
                </div>
                {imageFullscreen && (
                  <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={() => setImageFullscreen(false)}>
                    <img src={local.card_image_url} alt="Carte de visite" className="max-w-full max-h-full object-contain" />
                  </div>
                )}
              </div>
            )}

            {/* Infos Axonaut (entreprise) */}
            <div className="bg-white rounded-xl p-4 shadow-card border border-gray-100">
              <h2 className="text-sm font-semibold text-primary uppercase tracking-wide mb-3">Entreprise</h2>
              <dl className="space-y-2 text-sm">
                {company.address_street && (
                  <Row label="Adresse">
                    {company.address_street}
                    {company.address_zip_code && <>, {company.address_zip_code}</>}
                    {company.address_city && <> {company.address_city}</>}
                    {company.address_country && <>, {company.address_country}</>}
                  </Row>
                )}
                {company.siret && <Row label="SIRET">{company.siret}</Row>}
                {company.intracommunity_number && <Row label="TVA intra">{company.intracommunity_number}</Row>}
                {company.business_manager?.name && <Row label="Commercial">{company.business_manager.name}</Row>}
                {company.comments && <Row label="Commentaires"><span className="whitespace-pre-wrap">{company.comments}</span></Row>}
              </dl>
            </div>

            {/* Contacts Axonaut */}
            <div className="bg-white rounded-xl p-4 shadow-card border border-gray-100">
              <h2 className="text-sm font-semibold text-primary uppercase tracking-wide mb-3">Contacts ({employees.length})</h2>
              {employees.length === 0 ? (
                <p className="text-sm text-secondary">Aucun contact.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {employees.map((e) => {
                    const isH = String(e.id) === highlightEmployeeId
                    return (
                      <div key={e.id} className={`p-3 rounded-lg border ${isH ? 'border-accent bg-accent/5' : 'border-gray-100'}`}>
                        <p className="font-medium text-gray-900">
                          {e.firstname} {e.lastname}
                          {isH && <span className="ml-2 text-xs text-primary bg-accent/30 px-2 py-0.5 rounded-full">Sélectionné</span>}
                        </p>
                        {e.job && <p className="text-xs text-secondary">{e.job}</p>}
                        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-xs text-secondary">
                          {e.email && <a href={`mailto:${e.email}`} className="underline">{e.email}</a>}
                          {e.phone_number && <a href={`tel:${e.phone_number}`} className="underline">{e.phone_number}</a>}
                          {e.cellphone_number && <a href={`tel:${e.cellphone_number}`} className="underline">{e.cellphone_number}</a>}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Bloc CRM local (si présent) */}
            {local && (
              <div className="bg-white rounded-xl p-4 shadow-card border border-gray-100">
                <h2 className="text-sm font-semibold text-primary uppercase tracking-wide mb-3">CRM Terrain</h2>

                {!editMode ? (
                  <dl className="space-y-2 text-sm">
                    <Row label="Prénom">{local.prenom || '—'}</Row>
                    <Row label="Nom">{local.nom || '—'}</Row>
                    <Row label="Poste">{local.poste || '—'}</Row>
                    <Row label="Email">{local.email ? <a href={`mailto:${local.email}`} className="underline text-primary">{local.email}</a> : '—'}</Row>
                    <Row label="Téléphone">{local.telephone ? <a href={`tel:${local.telephone}`} className="underline text-primary">{local.telephone}</a> : '—'}</Row>
                    {local.telephone_2 && <Row label="Tél. 2"><a href={`tel:${local.telephone_2}`} className="underline text-primary">{local.telephone_2}</a></Row>}
                    {local.adresse && <Row label="Adresse">{local.adresse}</Row>}
                    {local.site_web && <Row label="Site"><a href={local.site_web} target="_blank" rel="noopener noreferrer" className="underline text-primary break-all">{local.site_web}</a></Row>}
                    {local.linkedin && <Row label="LinkedIn"><a href={local.linkedin} target="_blank" rel="noopener noreferrer" className="underline text-primary break-all">{local.linkedin}</a></Row>}
                    {local.note && <Row label="Note"><span className="whitespace-pre-wrap">{local.note}</span></Row>}
                  </dl>
                ) : (
                  <div className="flex flex-col gap-3">
                    <div className="grid grid-cols-2 gap-3">
                      <Input label="Prénom" value={ed.prenom || ''} onChange={(e) => setEditData({ ...ed, prenom: e.target.value })} />
                      <Input label="Nom" value={ed.nom || ''} onChange={(e) => setEditData({ ...ed, nom: e.target.value })} />
                    </div>
                    <Input label="Poste" value={ed.poste || ''} onChange={(e) => setEditData({ ...ed, poste: e.target.value })} />
                    <Input label="Email" type="email" value={ed.email || ''} onChange={(e) => setEditData({ ...ed, email: e.target.value })} />
                    <Input label="Téléphone" type="tel" value={ed.telephone || ''} onChange={(e) => setEditData({ ...ed, telephone: e.target.value })} />
                    <Input label="Téléphone 2" type="tel" value={ed.telephone_2 || ''} onChange={(e) => setEditData({ ...ed, telephone_2: e.target.value })} />
                    <Input label="Adresse" value={ed.adresse || ''} onChange={(e) => setEditData({ ...ed, adresse: e.target.value })} />
                    <Input label="Site web" value={ed.site_web || ''} onChange={(e) => setEditData({ ...ed, site_web: e.target.value })} />
                    <Input label="LinkedIn" value={ed.linkedin || ''} onChange={(e) => setEditData({ ...ed, linkedin: e.target.value })} />
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Note</label>
                      <textarea value={ed.note || ''} onChange={(e) => setEditData({ ...ed, note: e.target.value })}
                        className="w-full px-4 py-3 min-h-[100px] border-[1.5px] border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary resize-y" />
                    </div>
                    <div className="flex gap-2 mt-1">
                      <Button variant="outline" size="md" onClick={cancelEdit} fullWidth>Annuler</Button>
                      <Button variant="primary" size="md" onClick={saveEdit} disabled={saving} fullWidth>
                        {saving ? 'Sauvegarde…' : 'Enregistrer'}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Tâches locales */}
            {local && local.tasks.length > 0 && (
              <div className="bg-white rounded-xl p-4 shadow-card border border-gray-100">
                <h2 className="text-sm font-semibold text-primary uppercase tracking-wide mb-3">Mes tâches CRM ({local.tasks.length})</h2>
                <div className="flex flex-col gap-2">
                  {local.tasks.map((task, i) => (
                    <div key={task._id} className="flex items-center gap-3 p-3 rounded-lg border border-gray-100">
                      <button onClick={() => toggleLocalTaskDone(i)}
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
              </div>
            )}
          </div>
        )}

        {/* ─── Tab: HISTORIQUE ─────────────────────────────────────────── */}
        {tab === 'history' && (
          <div className="space-y-4">
            {/* Barre d'actions compacte */}
            <div className="flex gap-2">
              <button onClick={() => { setAddEventType('voice'); setEventTitle(''); setEventContent(''); setEventDuration('') }}
                className="flex-1 flex items-center justify-center gap-1.5 h-10 rounded-full bg-primary text-white font-medium text-xs shadow-btn hover:bg-primary/90 active:scale-95">
                <span>🎤</span>
                <span>Vocale</span>
              </button>
              <button onClick={() => setShowEventMenu(true)}
                className="flex-1 flex items-center justify-center gap-1.5 h-10 rounded-full bg-white border border-gray-200 text-primary font-medium text-xs hover:border-primary/40 hover:bg-primary/5 active:scale-95">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14" /></svg>
                <span>Événement</span>
              </button>
              <button onClick={() => setShowTaskForm(true)}
                className="flex-1 flex items-center justify-center gap-1.5 h-10 rounded-full bg-white border border-gray-200 text-primary font-medium text-xs hover:border-primary/40 hover:bg-primary/5 active:scale-95">
                <span>✓</span>
                <span>Tâche</span>
              </button>
            </div>

            {/* Chips de filtre + refresh */}
            <div className="flex items-center gap-1.5">
              <div className="flex-1 flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
                {([
                  { key: 'all',     label: 'Tout',    count: events.length },
                  { key: 'email',   label: 'Emails',  count: grouped.email.length },
                  { key: 'call',    label: 'Appels',  count: grouped.call.length },
                  { key: 'note',    label: 'Notes',   count: grouped.note.length },
                  { key: 'meeting', label: 'Réunions', count: grouped.meeting.length },
                  { key: 'other',   label: 'Autres',  count: grouped.mail.length + grouped.sms.length + grouped.other.length },
                ] as const).map((f) => (
                  <button key={f.key}
                    onClick={() => setHistoryFilter(f.key as any)}
                    className={`flex-shrink-0 text-[11px] px-2.5 h-7 rounded-full font-medium whitespace-nowrap transition-colors ${
                      historyFilter === f.key
                        ? 'bg-primary text-white'
                        : 'bg-white border border-gray-200 text-secondary hover:border-primary/30'
                    }`}>
                    {f.label} <span className="opacity-60">{f.count}</span>
                  </button>
                ))}
              </div>
              <button onClick={manualRefresh} aria-label="Actualiser"
                className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-white border border-gray-200 text-secondary hover:text-primary hover:border-primary/30">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M23 4v6h-6M1 20v-6h6" />
                  <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
                </svg>
              </button>
            </div>

            {events.length === 0 && (
              <div className="bg-white rounded-xl p-8 shadow-card border border-gray-100 text-center text-secondary text-sm">
                Aucun échange enregistré dans Axonaut.
              </div>
            )}

            {([
              { key: 'email', title: 'Emails' },
              { key: 'call', title: 'Appels' },
              { key: 'note', title: 'Notes' },
              { key: 'meeting', title: 'Réunions' },
              { key: 'mail', title: 'Courriers' },
              { key: 'sms', title: 'SMS' },
              { key: 'other', title: 'Autres' },
            ] as const).map(({ key, title }) => {
              const list = grouped[key]
              if (list.length === 0) return null
              // Appliquer le filtre
              if (historyFilter !== 'all') {
                if (historyFilter === 'other') {
                  if (key !== 'mail' && key !== 'sms' && key !== 'other') return null
                } else if (key !== historyFilter) {
                  return null
                }
              }
              return (
                <div key={key} className="bg-white rounded-xl p-4 shadow-card border border-gray-100">
                  <h2 className="text-sm font-semibold text-primary uppercase tracking-wide mb-3">{title} ({list.length})</h2>
                  <div className="flex flex-col gap-3">
                    {list.map((ev) => {
                      const { icon, label, key: natureKey } = normalizeNature(ev.nature)
                      const attachments = flattenAttachments(ev.attachments)
                      const isHtml = typeof ev.content === 'string' && /<[a-z][\s\S]*>/i.test(ev.content)
                      return (
                        <div key={ev.id} className="border-l-2 border-primary/20 pl-3">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-base">{icon}</span>
                            <span className="text-xs text-secondary">{label}</span>
                            <span className="text-xs text-secondary">·</span>
                            <span className="text-xs text-secondary">{formatDate(ev.timestamp ? ev.timestamp * 1000 : ev.date)}</span>
                          </div>
                          {ev.title && <p className="font-medium text-sm text-gray-900">{ev.title}</p>}
                          {ev.content && (
                            natureKey === 'email' || isHtml ? (
                              <div className="text-sm text-gray-700 break-words mt-0.5 email-body"
                                dangerouslySetInnerHTML={{
                                  __html: DOMPurify.sanitize(ev.content, {
                                    ALLOWED_TAGS: ['div','span','p','br','strong','b','em','i','u','a','ul','ol','li','blockquote','pre','code','table','thead','tbody','tr','td','th','h1','h2','h3','h4','h5','h6','hr','img'],
                                    ALLOWED_ATTR: ['href','target','rel','src','alt','title'],
                                  }),
                                }}
                              />
                            ) : (
                              <p className="text-sm text-gray-700 whitespace-pre-wrap break-words mt-0.5">{ev.content}</p>
                            )
                          )}
                          {attachments.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-2">
                              {attachments.map((a, idx) => (
                                <a key={idx} href={a.url} target="_blank" rel="noopener noreferrer"
                                  className="text-xs px-2 py-1 rounded-lg bg-gray-50 border border-gray-200 text-gray-700 hover:border-primary/30 inline-flex items-center gap-1">
                                  📎 {a.label}
                                </a>
                              ))}
                            </div>
                          )}
                          <div className="flex items-center justify-between mt-1 gap-2">
                            {(ev.users?.[0]?.fullname || ev.employees?.[0]?.fullname) ? (
                              <p className="text-xs text-secondary truncate">{ev.users?.[0]?.fullname || ev.employees?.[0]?.fullname}</p>
                            ) : <span />}
                            <a href={`https://axonaut.com/business/company/show/${company.id}`} target="_blank" rel="noopener noreferrer"
                              className="text-xs text-primary hover:underline whitespace-nowrap">Axonaut ↗</a>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* ─── Tab: BUSINESS ───────────────────────────────────────────── */}
        {tab === 'business' && (
          <div className="space-y-4">
            <section className="bg-white rounded-xl p-4 shadow-card border border-gray-100">
              <h2 className="text-sm font-semibold text-primary uppercase tracking-wide mb-3">Opportunités ({opportunities.length})</h2>
              {opportunities.length === 0 ? <p className="text-sm text-secondary">Aucune opportunité.</p> : (
                <div className="flex flex-col gap-2">
                  {opportunities.map((o) => (
                    <div key={o.id} className="p-3 rounded-lg border border-gray-100">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-medium text-sm text-gray-900">{o.name || `#${o.id}`}</p>
                        {o.is_win ? <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">Gagnée</span>
                         : o.is_archived ? <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">Archivée</span>
                         : <span className="text-xs px-2 py-0.5 rounded-full bg-accent/20 text-primary">En cours</span>}
                      </div>
                      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-xs text-secondary">
                        {o.amount !== undefined && <span>{formatAmount(o.amount)}</span>}
                        {o.probability !== undefined && <span>{o.probability}%</span>}
                        {o.pipe_step_name && <span>{o.pipe_step_name}</span>}
                        {o.due_date && <span>échéance {formatDate(o.due_date)}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="bg-white rounded-xl p-4 shadow-card border border-gray-100">
              <h2 className="text-sm font-semibold text-primary uppercase tracking-wide mb-3">Devis ({quotations.length})</h2>
              {quotations.length === 0 ? <p className="text-sm text-secondary">Aucun devis.</p> : (
                <div className="flex flex-col gap-2">
                  {quotations.map((q) => (
                    <a key={q.id} href={q.public_path || `https://axonaut.com/business/quotation/show/${q.id}`} target="_blank" rel="noopener noreferrer"
                      className="p-3 rounded-lg border border-gray-100 hover:border-primary/30">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-medium text-sm text-gray-900">{q.number || `#${q.id}`}{q.title && <span className="text-secondary font-normal"> — {q.title}</span>}</p>
                        {q.status && <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 capitalize">{q.status}</span>}
                      </div>
                      <div className="flex gap-3 mt-1 text-xs text-secondary">
                        <span>{formatDate(q.date)}</span>
                        {q.total_amount !== undefined && <span className="font-medium text-gray-900">{formatAmount(q.total_amount)}</span>}
                      </div>
                    </a>
                  ))}
                </div>
              )}
            </section>

            <section className="bg-white rounded-xl p-4 shadow-card border border-gray-100">
              <h2 className="text-sm font-semibold text-primary uppercase tracking-wide mb-3">Factures ({invoices.length})</h2>
              {invoices.length === 0 ? <p className="text-sm text-secondary">Aucune facture.</p> : (
                <div className="flex flex-col gap-2">
                  {invoices.map((i) => {
                    const isPaid = !!i.paid_date && !i.outstanding_amount
                    return (
                      <a key={i.id} href={i.public_path || `https://axonaut.com/business/invoice/show/${i.id}`} target="_blank" rel="noopener noreferrer"
                        className="p-3 rounded-lg border border-gray-100 hover:border-primary/30">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-medium text-sm text-gray-900">{i.number || `#${i.id}`}</p>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${isPaid ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                            {isPaid ? 'Payée' : 'À payer'}
                          </span>
                        </div>
                        <div className="flex gap-3 mt-1 text-xs text-secondary">
                          <span>{formatDate(i.date)}</span>
                          {i.total !== undefined && <span className="font-medium text-gray-900">{formatAmount(i.total, i.currency || 'EUR')}</span>}
                        </div>
                      </a>
                    )
                  })}
                </div>
              )}
            </section>
          </div>
        )}
      </div>

      {/* Menu type d'événement */}
      <Modal isOpen={showEventMenu} onClose={() => setShowEventMenu(false)} title="Type d'événement">
        <div className="flex flex-col gap-2 py-2">
          {EVENT_TYPE_OPTIONS.map((opt) => (
            <button key={opt.key}
              onClick={() => { setAddEventType(opt.key); setShowEventMenu(false); setEventTitle(''); setEventContent(''); setEventDuration('') }}
              className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 hover:border-primary/40 hover:bg-primary/5 text-left min-h-[52px]">
              <span className="text-xl">{opt.icon}</span>
              <span className="font-medium text-gray-900">{opt.label}</span>
            </button>
          ))}
        </div>
      </Modal>

      {/* Modale d'ajout event */}
      <Modal isOpen={!!addEventType} onClose={() => !addingEvent && setAddEventType(null)}
        title={
          addEventType === 'voice'
            ? 'Nouvelle note vocale'
            : addEventType
            ? `Nouvel(le) ${EVENT_TYPE_OPTIONS.find(o => o.key === addEventType)?.label.toLowerCase() || 'événement'}`
            : ''
        }>
        {addEventType === 'voice' ? (
          <div className="py-2">
            <p className="text-xs text-secondary mb-3 text-center">
              Enregistrez votre note, la transcription sera ajoutée automatiquement comme <strong>Note</strong> dans Axonaut.
            </p>
            <VoiceNote onTextReady={handleVoiceTranscription} />
            {addingEvent && (
              <p className="text-xs text-primary mt-3 text-center flex items-center justify-center gap-2">
                <span className="w-3 h-3 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                Envoi vers Axonaut…
              </p>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-3 py-2">
            <Input label="Titre (optionnel)" value={eventTitle} onChange={(e) => setEventTitle(e.target.value)} />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contenu</label>
              <textarea value={eventContent} onChange={(e) => setEventContent(e.target.value)}
                className="w-full px-4 py-3 min-h-[120px] border-[1.5px] border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary resize-y" />
            </div>
            {(addEventType === 'call' || addEventType === 'meeting') && (
              <Input label="Durée (minutes)" type="number" value={eventDuration} onChange={(e) => setEventDuration(e.target.value)} />
            )}
            <div className="flex gap-2 mt-1">
              <Button variant="outline" size="md" onClick={() => setAddEventType(null)} disabled={addingEvent} fullWidth>Annuler</Button>
              <Button variant="primary" size="md" onClick={submitEvent} disabled={addingEvent} fullWidth>
                {addingEvent ? 'Envoi…' : 'Ajouter dans Axonaut'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modale tâche */}
      <TaskForm isOpen={showTaskForm} onClose={() => setShowTaskForm(false)} onAdd={addAxonautTask} />
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
