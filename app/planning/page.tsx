'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import BottomNav from '@/components/BottomNav'
import NewTaskModal from '@/components/NewTaskModal'

interface PlanningItem {
  id: string
  description: string
  type: string
  due_date: string | null
  done: boolean
  hasTime: boolean
  contact_id: string
  contact_prenom: string
  contact_nom: string
  contact_societe: string
  axonaut_company_id?: string
  axonaut_synced: boolean
}

interface Payload {
  groups: {
    overdue: PlanningItem[]
    today: PlanningItem[]
    tomorrow: PlanningItem[]
    thisWeek: PlanningItem[]
    later: PlanningItem[]
    undated: PlanningItem[]
  }
  stats: {
    total: number
    open: number
    done: number
    overdue: number
    today: number
  }
}

const TYPE_ICONS: Record<string, string> = {
  rappel: '🔔',
  email: '✉️',
  reunion: '👥',
  devis: '📄',
  autre: '•',
}

const TYPE_COLORS: Record<string, string> = {
  rappel: '#F59E0B',   // orange
  email: '#8B5CF6',    // violet
  reunion: '#00B074',  // vert (action)
  devis: '#3B82F6',    // bleu
  autre: '#6B7280',    // gris
}

function typeIcon(type: string) {
  return TYPE_ICONS[type] || '•'
}

function typeColor(type: string) {
  return TYPE_COLORS[type] || TYPE_COLORS.autre
}

function formatTimeOnly(iso: string, hasTime: boolean): string {
  if (!hasTime) return 'Toute la journée'
  const d = new Date(iso)
  const h = d.getHours().toString().padStart(2, '0')
  const m = d.getMinutes().toString().padStart(2, '0')
  return `${h}:${m}`
}

function formatDayLabel(date: Date): string {
  return date.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

export default function PlanningPage() {
  const router = useRouter()
  const [user, setUser] = useState<{ prenom: string; nom: string; role: string } | null>(null)
  const [data, setData] = useState<Payload | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showNewTask, setShowNewTask] = useState(false)
  const [includeDone, setIncludeDone] = useState(false)
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list')
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const d = new Date()
    return new Date(d.getFullYear(), d.getMonth(), 1)
  })
  const [selectedDay, setSelectedDay] = useState<Date>(() => {
    const d = new Date()
    return new Date(d.getFullYear(), d.getMonth(), d.getDate())
  })

  const load = async () => {
    const token = localStorage.getItem('token')
    if (!token) {
      router.replace('/login')
      return
    }
    try {
      const url = includeDone ? '/api/planning?includeDone=true' : '/api/planning'
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      })
      if (!res.ok) throw new Error()
      setData(await res.json())
    } catch {
      // silencieux
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const stored = localStorage.getItem('user')
    if (stored) setUser(JSON.parse(stored))
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [includeDone])

  const toggleTaskDone = async (item: PlanningItem) => {
    const token = localStorage.getItem('token')
    if (!token) return
    // Optimiste
    setData((prev) => {
      if (!prev) return prev
      const newGroups = { ...prev.groups }
      ;(Object.keys(newGroups) as Array<keyof typeof newGroups>).forEach((k) => {
        newGroups[k] = newGroups[k].map((i) => (i.id === item.id ? { ...i, done: !i.done } : i))
      })
      return { ...prev, groups: newGroups }
    })

    try {
      const res = await fetch(`/api/contacts/${item.contact_id}/tasks/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ done: !item.done }),
      })
      if (!res.ok) throw new Error()
      // Recharger pour récupérer les vrais compteurs + éviter qu'une tâche cochée réapparaisse
      setTimeout(() => load(), 300)
    } catch {
      // Rollback
      setData((prev) => {
        if (!prev) return prev
        const newGroups = { ...prev.groups }
        ;(Object.keys(newGroups) as Array<keyof typeof newGroups>).forEach((k) => {
          newGroups[k] = newGroups[k].map((i) => (i.id === item.id ? { ...i, done: item.done } : i))
        })
        return { ...prev, groups: newGroups }
      })
    }
  }

  const openContact = (item: PlanningItem) => {
    if (item.axonaut_synced && item.axonaut_company_id) {
      router.push(`/contacts/axonaut/company/${item.axonaut_company_id}`)
    } else {
      router.push(`/contacts/local/${item.contact_id}`)
    }
  }

  // Filtrage recherche
  const filterItem = (i: PlanningItem) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      i.description.toLowerCase().includes(q) ||
      i.contact_prenom.toLowerCase().includes(q) ||
      i.contact_nom.toLowerCase().includes(q) ||
      i.contact_societe.toLowerCase().includes(q)
    )
  }

  const applyFilter = (arr: PlanningItem[]) => arr.filter(filterItem)

  if (loading) {
    return (
      <div className="min-h-screen bg-page">
        <Navbar prenom={user?.prenom} nom={user?.nom} role={user?.role} />
        <div className="p-8 flex justify-center">
          <div className="w-8 h-8 border-[3px] border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  const groups = data?.groups
  const stats = data?.stats

  const today = groups ? applyFilter(groups.today) : []
  const overdue = groups ? applyFilter(groups.overdue) : []
  const tomorrow = groups ? applyFilter(groups.tomorrow) : []
  const thisWeek = groups ? applyFilter(groups.thisWeek) : []
  const later = groups ? applyFilter(groups.later) : []
  const undated = groups ? applyFilter(groups.undated) : []

  const totalVisible =
    overdue.length + today.length + tomorrow.length + thisWeek.length + later.length + undated.length

  const totalOpen = stats?.open ?? 0
  const totalDone = stats?.done ?? 0
  const totalAll = (stats?.total ?? 0) || 1

  return (
    <div className="min-h-screen bg-page pb-28">
      <Navbar prenom={user?.prenom} nom={user?.nom} role={user?.role} />

      <div className="p-4">
        {/* Search */}
        <div className="relative mb-4">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2"
               className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            type="text"
            placeholder="Rechercher dans vos activités..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 h-11 border border-line rounded-2xl text-ink placeholder-ink-muted bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>

        {/* Titre + stats + bouton + */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-ink">Votre planning</h1>
            <p className="text-sm text-ink-soft mt-0.5">
              {totalDone}/{totalAll} activités réalisées
            </p>
          </div>
          <button
            onClick={() => setShowNewTask(true)}
            aria-label="Nouvelle tâche"
            className="h-12 px-5 rounded-full bg-primary text-white font-semibold shadow-btn hover:bg-primary/90 active:scale-95 flex items-center gap-2 flex-shrink-0"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8">
              <path d="M12 5v14M5 12h14" />
            </svg>
            <span className="text-sm">Tâche</span>
          </button>
        </div>

        {/* Cards stats */}
        <div className="flex gap-3 mt-4">
          <div className="flex-1 bg-white rounded-2xl border border-line p-3 flex items-center gap-3">
            <div className="relative w-10 h-10 rounded-xl bg-surface-2 flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1F2937" strokeWidth="1.5">
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <path d="M16 2v4M8 2v4M3 10h18" />
              </svg>
              {overdue.length > 0 && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white" />
              )}
            </div>
            <div>
              <p className="text-xl font-bold text-ink leading-tight">{totalOpen}</p>
              <p className="text-[11px] text-ink-muted">à faire</p>
            </div>
          </div>
          <div className="flex-1 bg-white rounded-2xl border border-line p-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-surface-2 flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1F2937" strokeWidth="1.5">
                <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" />
              </svg>
            </div>
            <div>
              <p className="text-xl font-bold text-ink leading-tight">{totalDone}</p>
              <p className="text-[11px] text-ink-muted">réalisées</p>
            </div>
          </div>
        </div>

        {/* Toggle Liste / Calendrier */}
        <div className="flex gap-1 bg-surface-2 rounded-xl p-1 mt-5 w-full">
          <button
            onClick={() => setViewMode('list')}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-1.5 ${
              viewMode === 'list' ? 'bg-white text-primary shadow-sm' : 'text-ink-soft'
            }`}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="8" y1="6" x2="21" y2="6" />
              <line x1="8" y1="12" x2="21" y2="12" />
              <line x1="8" y1="18" x2="21" y2="18" />
              <line x1="3" y1="6" x2="3.01" y2="6" />
              <line x1="3" y1="12" x2="3.01" y2="12" />
              <line x1="3" y1="18" x2="3.01" y2="18" />
            </svg>
            Liste
          </button>
          <button
            onClick={() => setViewMode('calendar')}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-1.5 ${
              viewMode === 'calendar' ? 'bg-white text-primary shadow-sm' : 'text-ink-soft'
            }`}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            Calendrier
          </button>
        </div>

        {/* Vue Calendrier */}
        {viewMode === 'calendar' && groups && (
          <CalendarView
            groups={groups}
            month={calendarMonth}
            selectedDay={selectedDay}
            onChangeMonth={setCalendarMonth}
            onSelectDay={setSelectedDay}
            onOpenContact={openContact}
            onToggle={toggleTaskDone}
          />
        )}

        {/* Vue Liste */}
        {viewMode === 'list' && (
        <div className="mt-6 flex flex-col gap-6">
          {overdue.length > 0 && (
            <Group title="En retard" count={overdue.length} accent="danger">
              {overdue.map((i) => <ActivityRow key={i.id} item={i} onOpen={() => openContact(i)} onToggle={() => toggleTaskDone(i)} />)}
            </Group>
          )}
          {today.length > 0 && (
            <Group title={`Aujourd'hui, ${formatDayLabel(new Date())}`} count={today.length}>
              {today.map((i) => <ActivityRow key={i.id} item={i} onOpen={() => openContact(i)} onToggle={() => toggleTaskDone(i)} />)}
            </Group>
          )}
          {tomorrow.length > 0 && (
            <Group title={`Demain, ${formatDayLabel(new Date(Date.now() + 86400000))}`} count={tomorrow.length}>
              {tomorrow.map((i) => <ActivityRow key={i.id} item={i} onOpen={() => openContact(i)} onToggle={() => toggleTaskDone(i)} />)}
            </Group>
          )}
          {thisWeek.length > 0 && (
            <Group title="Cette semaine" count={thisWeek.length}>
              {thisWeek.map((i) => <ActivityRow key={i.id} item={i} onOpen={() => openContact(i)} onToggle={() => toggleTaskDone(i)} />)}
            </Group>
          )}
          {later.length > 0 && (
            <Group title="Plus tard" count={later.length}>
              {later.map((i) => <ActivityRow key={i.id} item={i} onOpen={() => openContact(i)} onToggle={() => toggleTaskDone(i)} />)}
            </Group>
          )}
          {undated.length > 0 && (
            <Group title="Sans date" count={undated.length}>
              {undated.map((i) => <ActivityRow key={i.id} item={i} onOpen={() => openContact(i)} onToggle={() => toggleTaskDone(i)} />)}
            </Group>
          )}

          {totalVisible === 0 && (
            <div className="bg-white rounded-2xl border border-line p-8 text-center">
              <p className="text-ink-soft text-sm">
                {search ? 'Aucune activité ne correspond.' : 'Aucune activité en attente. 🎉'}
              </p>
            </div>
          )}

          {/* Toggle afficher terminées */}
          <label className="flex items-center justify-center gap-2 cursor-pointer select-none mt-2 text-sm text-ink-soft">
            <input type="checkbox" checked={includeDone} onChange={(e) => setIncludeDone(e.target.checked)}
              className="w-4 h-4 accent-primary rounded" />
            Afficher aussi les tâches terminées
          </label>
        </div>
        )}
      </div>

      <NewTaskModal
        isOpen={showNewTask}
        onClose={() => setShowNewTask(false)}
        onCreated={() => {
          load()
        }}
      />

      <BottomNav prenom={user?.prenom} nom={user?.nom} role={user?.role} />
    </div>
  )
}

function Group({
  title,
  count,
  accent,
  children,
}: {
  title: string
  count: number
  accent?: 'danger'
  children: React.ReactNode
}) {
  return (
    <section>
      <h2 className={`text-sm font-semibold uppercase tracking-wide mb-2 flex items-center gap-2 ${accent === 'danger' ? 'text-red-600' : 'text-ink-soft'}`}>
        {title}
        <span className="text-[11px] font-normal text-ink-muted">({count})</span>
      </h2>
      <div className="bg-white rounded-2xl border border-line overflow-hidden">
        {children}
      </div>
    </section>
  )
}

// ─── Vue Calendrier ────────────────────────────────────────────────────────
function CalendarView({
  groups,
  month,
  selectedDay,
  onChangeMonth,
  onSelectDay,
  onOpenContact,
  onToggle,
}: {
  groups: Payload['groups']
  month: Date
  selectedDay: Date
  onChangeMonth: (d: Date) => void
  onSelectDay: (d: Date) => void
  onOpenContact: (item: PlanningItem) => void
  onToggle: (item: PlanningItem) => void
}) {
  // Aplatit tous les items
  const allItems: PlanningItem[] = [
    ...groups.overdue,
    ...groups.today,
    ...groups.tomorrow,
    ...groups.thisWeek,
    ...groups.later,
  ]

  // Construit une Map<YYYY-MM-DD, PlanningItem[]>
  const byDay = new Map<string, PlanningItem[]>()
  for (const item of allItems) {
    if (!item.due_date) continue
    const d = new Date(item.due_date)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    if (!byDay.has(key)) byDay.set(key, [])
    byDay.get(key)!.push(item)
  }

  // Trie les items de chaque jour par heure
  for (const arr of byDay.values()) {
    arr.sort((a, b) => {
      if (!a.due_date) return 1
      if (!b.due_date) return -1
      return new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
    })
  }

  const keyOf = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Génération des jours à afficher (lundi → dimanche)
  // On commence par le lundi de la semaine qui contient le 1er du mois
  const firstOfMonth = new Date(month.getFullYear(), month.getMonth(), 1)
  const startDay = new Date(firstOfMonth)
  // Jour de semaine (0=dim → 6=sam). On veut partir du lundi (1).
  let dow = startDay.getDay()
  if (dow === 0) dow = 7 // dim → 7
  startDay.setDate(startDay.getDate() - (dow - 1))

  // 6 semaines = 42 jours (toujours, pour une grille régulière)
  const days: Date[] = []
  for (let i = 0; i < 42; i++) {
    const d = new Date(startDay)
    d.setDate(startDay.getDate() + i)
    days.push(d)
  }

  const prevMonth = () => {
    onChangeMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))
  }
  const nextMonth = () => {
    onChangeMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))
  }

  const selectedKey = keyOf(selectedDay)
  const selectedItems = byDay.get(selectedKey) || []

  const monthLabel = month.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
  const selectedLabel = selectedDay.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  return (
    <div className="mt-4 flex flex-col gap-4">
      {/* Nav mois */}
      <div className="bg-white rounded-2xl border border-line p-3">
        <div className="flex items-center justify-between mb-3">
          <button onClick={prevMonth} aria-label="Mois précédent"
            className="w-9 h-9 rounded-lg hover:bg-surface-2 flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1F2937" strokeWidth="2">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <h2 className="text-sm font-bold text-ink capitalize">{monthLabel}</h2>
          <button onClick={nextMonth} aria-label="Mois suivant"
            className="w-9 h-9 rounded-lg hover:bg-surface-2 flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1F2937" strokeWidth="2">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        </div>

        {/* Libellés jours de la semaine */}
        <div className="grid grid-cols-7 gap-0.5 mb-1">
          {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, i) => (
            <div key={i} className="text-center text-[10px] font-semibold text-ink-muted uppercase tracking-wide py-1">
              {d}
            </div>
          ))}
        </div>

        {/* Grille des jours */}
        <div className="grid grid-cols-7 gap-0.5">
          {days.map((d, i) => {
            const k = keyOf(d)
            const dayItems = byDay.get(k) || []
            const openItems = dayItems.filter((it) => !it.done)
            const isCurrentMonth = d.getMonth() === month.getMonth()
            const isSelected = k === selectedKey
            const isToday = keyOf(today) === k

            // Récupère les types uniques (ordre : d'abord openItems puis done)
            const seen = new Set<string>()
            const typesOrdered: string[] = []
            for (const it of [...openItems, ...dayItems.filter((x) => x.done)]) {
              if (!seen.has(it.type)) {
                seen.add(it.type)
                typesOrdered.push(it.type)
              }
            }
            const visibleTypes = typesOrdered.slice(0, 3)
            const hasMore = typesOrdered.length > 3

            return (
              <button
                key={i}
                onClick={() => onSelectDay(new Date(d))}
                className={`h-14 rounded-lg text-sm font-medium relative flex flex-col items-center justify-start pt-1.5 transition-colors ${
                  isSelected
                    ? 'bg-primary text-white'
                    : isToday
                    ? 'bg-primary/10 text-primary'
                    : isCurrentMonth
                    ? 'text-ink hover:bg-surface-2'
                    : 'text-ink-muted hover:bg-surface-2'
                }`}
              >
                <span className="leading-none">{d.getDate()}</span>

                {/* Pastilles colorées par type */}
                {dayItems.length > 0 && (
                  <div className="absolute bottom-1 left-1 right-1 flex items-center justify-center gap-0.5">
                    {visibleTypes.map((t, idx) => (
                      <span
                        key={idx}
                        className="w-1.5 h-1.5 rounded-full ring-1"
                        style={{
                          backgroundColor: isSelected ? 'rgba(255,255,255,0.95)' : typeColor(t),
                          // Ring pour lisibilité sur fond bleu quand sélectionné
                          boxShadow: isSelected ? '0 0 0 1px rgba(255,255,255,0.4)' : 'none',
                        }}
                      />
                    ))}
                    {hasMore && (
                      <span
                        className={`text-[8px] font-bold leading-none ml-0.5 ${
                          isSelected ? 'text-white' : 'text-ink-muted'
                        }`}
                      >
                        +
                      </span>
                    )}
                  </div>
                )}

                {/* Badge count en haut-droite si >= 3 tâches */}
                {openItems.length >= 3 && (
                  <span
                    className={`absolute top-0.5 right-0.5 text-[8px] font-bold px-1 py-[1px] rounded-full leading-none ${
                      isSelected
                        ? 'bg-white/25 text-white'
                        : 'bg-action text-white'
                    }`}
                  >
                    {openItems.length}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Légende des couleurs */}
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 mt-3 pt-3 border-t border-line">
          {[
            { key: 'rappel', label: 'Rappel' },
            { key: 'email', label: 'Email' },
            { key: 'reunion', label: 'Réunion' },
            { key: 'devis', label: 'Devis' },
            { key: 'autre', label: 'Autre' },
          ].map((t) => (
            <div key={t.key} className="flex items-center gap-1 text-[10px] text-ink-muted">
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: typeColor(t.key) }} />
              {t.label}
            </div>
          ))}
        </div>
      </div>

      {/* Liste du jour sélectionné */}
      <section>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-ink-soft mb-2 flex items-center gap-2">
          {selectedLabel}
          <span className="text-[11px] font-normal text-ink-muted">
            ({selectedItems.length} {selectedItems.length > 1 ? 'activités' : 'activité'})
          </span>
        </h3>
        {selectedItems.length === 0 ? (
          <div className="bg-white rounded-2xl border border-line p-6 text-center text-ink-soft text-sm">
            Rien de prévu ce jour-là.
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-line overflow-hidden">
            {selectedItems.map((i) => (
              <ActivityRow key={i.id} item={i} onOpen={() => onOpenContact(i)} onToggle={() => onToggle(i)} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function ActivityRow({
  item,
  onOpen,
  onToggle,
}: {
  item: PlanningItem
  onOpen: () => void
  onToggle: () => void
}) {
  const name = `${item.contact_prenom} ${item.contact_nom}`.trim()
  return (
    <div className="w-full flex items-start gap-3 p-3 border-b border-line last:border-b-0 hover:bg-surface-2">
      <button
        onClick={onOpen}
        className="flex items-start gap-3 flex-1 min-w-0 text-left"
      >
        <div className="w-9 h-9 rounded-xl bg-surface-2 flex items-center justify-center flex-shrink-0 text-base">
          {typeIcon(item.type)}
        </div>
        <div className="flex-1 min-w-0">
          <p className={`font-medium text-sm truncate ${item.done ? 'line-through text-ink-muted' : 'text-ink'}`}>
            {item.description || '(sans description)'}
          </p>
          <p className="text-[12px] text-ink-muted mt-0.5">
            {item.due_date ? formatTimeOnly(item.due_date, item.hasTime) : 'Sans date'}
          </p>
          {(name || item.contact_societe) && (
            <p className="text-[12px] text-ink-soft mt-1 truncate">
              {name}
              {item.contact_societe && (
                <>
                  {name && <span className="text-ink-muted"> · </span>}
                  {item.contact_societe}
                </>
              )}
            </p>
          )}
        </div>
      </button>
      <button
        onClick={onToggle}
        aria-label={item.done ? 'Marquer à faire' : 'Marquer comme terminée'}
        className={`w-7 h-7 rounded-full border-2 flex items-center justify-center mt-1 flex-shrink-0 transition-colors ${
          item.done
            ? 'bg-action border-action'
            : 'border-line hover:border-action hover:bg-action-soft'
        }`}
      >
        {item.done && (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
            <path d="M20 6L9 17l-5-5" />
          </svg>
        )}
      </button>
    </div>
  )
}
