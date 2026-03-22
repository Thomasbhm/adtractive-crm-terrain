'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Button from './ui/Button'
import Badge from './ui/Badge'
import Toast from './ui/Toast'
import Modal from './ui/Modal'
import TaskForm, { TaskData } from './TaskForm'

interface ContactData {
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
}

interface ContactFormProps {
  mode: 'scan' | 'manuel'
  contacts?: Array<Record<string, string>>
  imageUrl?: string
  onBack?: () => void
  onSaved?: () => void
}

interface CompanySuggestion {
  id: number
  name: string
}

const emptyContact: ContactData = {
  prenom: '', nom: '', societe: '', poste: '', email: '',
  telephone: '', telephone_2: '', adresse: '', site_web: '', linkedin: '',
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-bold uppercase tracking-wider text-secondary mt-6 mb-3">
      {children}
    </p>
  )
}

function IconInput({
  icon, label, value, onChange, type = 'text', autoComplete, placeholder, children, onFocus, onBlur,
}: {
  icon: React.ReactNode; label: string; value: string;
  onChange: (v: string) => void; type?: string; autoComplete?: string; placeholder?: string;
  children?: React.ReactNode; onFocus?: () => void; onBlur?: () => void;
}) {
  return (
    <div className="w-full relative">
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">{icon}</span>
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          placeholder={placeholder}
          onFocus={onFocus}
          onBlur={onBlur}
          className="w-full pl-10 pr-4 py-3 min-h-[48px] border-[1.5px] border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
        />
      </div>
      {children}
    </div>
  )
}

// SVG Icons
const PersonIcon = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
const BuildingIcon = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 21h18M9 8h1M9 12h1M9 16h1M14 8h1M14 12h1M14 16h1M5 21V5a2 2 0 012-2h10a2 2 0 012 2v16"/></svg>
const BriefcaseIcon = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/></svg>
const MailIcon = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 7l-10 7L2 7"/></svg>
const PhoneIcon = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>
const MapIcon = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
const GlobeIcon = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>
const LinkedInIcon = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-4 0v7h-4v-7a6 6 0 016-6zM2 9h4v12H2zM4 6a2 2 0 100-4 2 2 0 000 4z"/></svg>
const NoteIcon = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>

export default function ContactForm({ mode, contacts: initialContacts, imageUrl, onBack, onSaved }: ContactFormProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState(0)
  const [contacts, setContacts] = useState<ContactData[]>(
    initialContacts?.length
      ? initialContacts.map((c) => ({
          prenom: c.prenom || '', nom: c.nom || '', societe: c.societe || '',
          poste: c.poste || '', email: c.email || '', telephone: c.telephone || '',
          telephone_2: c.telephone_2 || '', adresse: c.adresse || '',
          site_web: c.site_web || '', linkedin: c.linkedin || '',
        }))
      : [{ ...emptyContact }]
  )
  const [note, setNote] = useState('')
  const [tasks, setTasks] = useState<TaskData[]>([])
  const [showTaskForm, setShowTaskForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [imageFullscreen, setImageFullscreen] = useState(false)

  // Axonaut company autocomplete
  const [selectedAxonautCompanyId, setSelectedAxonautCompanyId] = useState<number | null>(null)
  const [companySuggestions, setCompanySuggestions] = useState<CompanySuggestion[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Popup doublon Axonaut
  const [showDuplicateModal, setShowDuplicateModal] = useState(false)
  const [duplicateCompany, setDuplicateCompany] = useState<CompanySuggestion | null>(null)
  const pendingSaveRef = useRef(false)

  const currentContact = contacts[activeTab]

  const updateField = (field: keyof ContactData, value: string) => {
    const updated = [...contacts]
    updated[activeTab] = { ...updated[activeTab], [field]: value }
    setContacts(updated)
  }

  const searchAxonautCompanies = useCallback(async (query: string) => {
    if (query.length < 3) {
      setCompanySuggestions([])
      setShowSuggestions(false)
      return
    }

    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`/api/axonaut/companies?search=${encodeURIComponent(query)}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setCompanySuggestions(data)
        setShowSuggestions(data.length > 0)
      }
    } catch {
      // Silently fail
    }
  }, [])

  const handleSocieteChange = (value: string) => {
    updateField('societe', value)
    // Reset la sélection si l'utilisateur modifie manuellement
    setSelectedAxonautCompanyId(null)

    // Debounce la recherche
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      searchAxonautCompanies(value)
    }, 400)
  }

  const handleSelectCompany = (suggestion: CompanySuggestion) => {
    updateField('societe', suggestion.name)
    setSelectedAxonautCompanyId(suggestion.id)
    setShowSuggestions(false)
    setCompanySuggestions([])
  }

  // Cleanup debounce
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  const doSave = async (axonautCompanyId: number | null) => {
    setSaving(true)
    try {
      const token = localStorage.getItem('token')

      const savedContactIds: string[] = []

      for (const contact of contacts) {
        const res = await fetch('/api/contacts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            ...contact,
            note,
            source: mode === 'scan' ? 'scan_carte' : 'manuel',
            card_image_url: imageUrl || '',
            axonaut_company_id: axonautCompanyId ? axonautCompanyId.toString() : '',
            tasks: tasks.map((t) => ({
              description: t.description,
              type: t.type,
              due_date: t.due_date,
              done: false,
            })),
          }),
        })

        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || 'Erreur lors de l\'enregistrement')
        }

        const savedContact = await res.json()
        savedContactIds.push(savedContact._id)
      }

      // Sync automatique avec Axonaut pour chaque contact
      for (const contactId of savedContactIds) {
        try {
          await fetch('/api/axonaut/sync', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ contactId }),
          })
        } catch {
          // Non bloquant — le contact est enregistré même si la sync échoue
        }
      }

      setToast({ message: 'Contact enregistré et synchronisé !', type: 'success' })
      setTimeout(() => {
        if (onSaved) {
          onSaved()
        } else {
          router.push('/scan')
        }
      }, 1500)
    } catch (err) {
      setToast({
        message: err instanceof Error ? err.message : 'Erreur lors de l\'enregistrement',
        type: 'error',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleSave = async () => {
    // Si pas de company Axonaut sélectionnée et société non vide → vérifier doublon
    if (selectedAxonautCompanyId === null && currentContact.societe.trim()) {
      try {
        const token = localStorage.getItem('token')
        const res = await fetch(
          `/api/axonaut/companies?search=${encodeURIComponent(currentContact.societe)}`,
          { headers: { Authorization: `Bearer ${token}` } }
        )
        if (res.ok) {
          const results: CompanySuggestion[] = await res.json()
          if (results.length > 0) {
            // Afficher la popup de doublon
            setDuplicateCompany(results[0])
            setShowDuplicateModal(true)
            return
          }
        }
      } catch {
        // Si erreur de recherche, on continue l'enregistrement normalement
      }
    }

    doSave(selectedAxonautCompanyId)
  }

  const handleDuplicateConfirm = () => {
    // Rattacher à la company existante
    setSelectedAxonautCompanyId(duplicateCompany!.id)
    setShowDuplicateModal(false)
    doSave(duplicateCompany!.id)
  }

  const handleDuplicateReject = () => {
    // Créer une nouvelle company lors de la sync
    setShowDuplicateModal(false)
    doSave(null)
  }

  return (
    <div className="p-4 pb-24">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        {onBack && (
          <button onClick={onBack} className="min-h-[48px] min-w-[48px] flex items-center justify-center">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1B2B6B" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
        )}
        <Badge variant={mode === 'scan' ? 'accent' : 'primary'}>
          {mode === 'scan' ? 'Issu d\'un scan' : 'Saisie manuelle'}
        </Badge>
      </div>

      {/* Card image */}
      {mode === 'scan' && imageUrl && (
        <>
          <div
            className="w-full max-h-[200px] rounded-xl overflow-hidden border-[1.5px] border-gray-200 mb-4 cursor-pointer shadow-card"
            onClick={() => setImageFullscreen(true)}
          >
            <img src={imageUrl} alt="Carte de visite" className="w-full h-full object-contain bg-gray-50" />
          </div>
          {imageFullscreen && (
            <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={() => setImageFullscreen(false)}>
              <img src={imageUrl} alt="Carte de visite" className="max-w-full max-h-full object-contain" />
            </div>
          )}
        </>
      )}

      {/* Multi-contact tabs */}
      {contacts.length > 1 && (
        <div className="flex gap-2 mb-4 overflow-x-auto">
          {contacts.map((_, i) => (
            <button
              key={i}
              onClick={() => setActiveTab(i)}
              className={`px-4 py-2 min-h-[48px] rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                activeTab === i ? 'bg-primary text-white shadow-btn' : 'bg-gray-100 text-gray-600'
              }`}
            >
              Contact {i + 1}
            </button>
          ))}
        </div>
      )}

      {/* SECTION: Identité */}
      <SectionTitle>Identité</SectionTitle>
      <div className="bg-white rounded-2xl p-4 shadow-card border border-gray-100 flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-3">
          <IconInput icon={PersonIcon} label="Prénom" value={currentContact.prenom} onChange={(v) => updateField('prenom', v)} autoComplete="given-name" />
          <IconInput icon={PersonIcon} label="Nom" value={currentContact.nom} onChange={(v) => updateField('nom', v)} autoComplete="family-name" />
        </div>

        {/* Société avec autocomplétion Axonaut */}
        <IconInput
          icon={BuildingIcon}
          label="Société"
          value={currentContact.societe}
          onChange={handleSocieteChange}
          autoComplete="off"
          onFocus={() => { if (companySuggestions.length > 0) setShowSuggestions(true) }}
          onBlur={() => { setTimeout(() => setShowSuggestions(false), 200) }}
        >
          {/* Dropdown suggestions */}
          {showSuggestions && companySuggestions.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-10 overflow-hidden">
              {companySuggestions.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => handleSelectCompany(s)}
                  className="w-full px-4 py-3 text-left text-sm hover:bg-gray-50 border-b border-gray-100 last:border-b-0 flex items-center gap-2"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1B2B6B" strokeWidth="1.5">
                    <path d="M3 21h18M9 8h1M9 12h1M9 16h1M14 8h1M14 12h1M14 16h1M5 21V5a2 2 0 012-2h10a2 2 0 012 2v16"/>
                  </svg>
                  <span className="text-gray-900">{s.name}</span>
                  <span className="text-xs text-secondary ml-auto">Axonaut</span>
                </button>
              ))}
            </div>
          )}
          {selectedAxonautCompanyId && (
            <p className="text-xs text-green-600 mt-1">Entreprise Axonaut liée</p>
          )}
        </IconInput>

        <IconInput icon={BriefcaseIcon} label="Poste" value={currentContact.poste} onChange={(v) => updateField('poste', v)} autoComplete="organization-title" />
      </div>

      {/* SECTION: Coordonnées */}
      <SectionTitle>Coordonnées</SectionTitle>
      <div className="bg-white rounded-2xl p-4 shadow-card border border-gray-100 flex flex-col gap-3">
        <IconInput icon={MailIcon} label="Email" value={currentContact.email} onChange={(v) => updateField('email', v)} type="email" autoComplete="email" />
        <IconInput icon={PhoneIcon} label="Téléphone" value={currentContact.telephone} onChange={(v) => updateField('telephone', v)} type="tel" autoComplete="tel" />
        <IconInput icon={PhoneIcon} label="Téléphone 2" value={currentContact.telephone_2} onChange={(v) => updateField('telephone_2', v)} type="tel" />
        <IconInput icon={MapIcon} label="Adresse" value={currentContact.adresse} onChange={(v) => updateField('adresse', v)} autoComplete="street-address" />
      </div>

      {/* SECTION: Réseaux */}
      <SectionTitle>Réseaux</SectionTitle>
      <div className="bg-white rounded-2xl p-4 shadow-card border border-gray-100 flex flex-col gap-3">
        <IconInput icon={GlobeIcon} label="Site web" value={currentContact.site_web} onChange={(v) => updateField('site_web', v)} type="url" autoComplete="url" />
        <IconInput icon={LinkedInIcon} label="LinkedIn" value={currentContact.linkedin} onChange={(v) => updateField('linkedin', v)} />
      </div>

      {/* SECTION: Notes & Suivi */}
      <SectionTitle>Notes & Suivi</SectionTitle>
      <div className="bg-white rounded-2xl p-4 shadow-card border border-gray-100 flex flex-col gap-4">
        {/* Note */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Note</label>
          <div className="relative">
            <span className="absolute left-3 top-3 text-gray-400">{NoteIcon}</span>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Notes sur cette rencontre..."
              className="w-full pl-10 pr-4 py-3 min-h-[100px] border-[1.5px] border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-y"
            />
          </div>
        </div>

        {/* Tasks */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-primary text-sm">Tâches / Rappels</h3>
            <Button variant="outline" size="sm" onClick={() => setShowTaskForm(true)}>
              + Ajouter une tâche
            </Button>
          </div>

          {tasks.length > 0 && (
            <div className="flex flex-col gap-2">
              {tasks.map((task, i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{task.description}</p>
                    <p className="text-xs text-gray-500">
                      {task.type} {task.due_date && `· ${new Date(task.due_date).toLocaleDateString('fr-FR')}`}
                    </p>
                  </div>
                  <button
                    onClick={() => setTasks(tasks.filter((_, j) => j !== i))}
                    className="text-gray-400 hover:text-red-500 min-w-[44px] min-h-[44px] flex items-center justify-center"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Voice notes placeholder */}
        <div className="opacity-50">
          <div className="p-3 bg-gray-50 rounded-xl border border-dashed border-gray-300 text-center">
            <p className="text-sm text-gray-500">Notes vocales — Disponible en v0.3</p>
          </div>
        </div>
      </div>

      {/* Save button */}
      <Button
        variant="primary"
        size="lg"
        fullWidth
        className="mt-8 shadow-btn"
        onClick={handleSave}
        disabled={saving}
      >
        {saving ? 'Enregistrement...' : 'Enregistrer le contact'}
      </Button>

      <TaskForm isOpen={showTaskForm} onClose={() => setShowTaskForm(false)} onAdd={(task) => setTasks([...tasks, task])} />

      {/* Modal doublon Axonaut */}
      <Modal
        isOpen={showDuplicateModal}
        onClose={() => setShowDuplicateModal(false)}
        title="Entreprise déjà existante dans Axonaut"
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-secondary">
            Nous avons trouvé une entreprise du même nom dans votre CRM Axonaut :
          </p>
          <div className="bg-accent/10 rounded-xl p-4">
            <p className="font-semibold text-primary">{duplicateCompany?.name}</p>
          </div>
          <p className="text-sm text-secondary">
            Voulez-vous rattacher ce contact à cette entreprise ?
          </p>
          <div className="flex gap-3 mt-2">
            <Button variant="outline" fullWidth onClick={handleDuplicateReject}>
              Non, créer une nouvelle
            </Button>
            <Button variant="primary" fullWidth onClick={handleDuplicateConfirm}>
              Oui, rattacher
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
