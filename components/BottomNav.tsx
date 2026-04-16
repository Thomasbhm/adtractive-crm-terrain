'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'

interface BottomNavProps {
  prenom?: string
  nom?: string
  role?: string
}

export default function BottomNav({ prenom, nom, role }: BottomNavProps) {
  const router = useRouter()
  const pathname = usePathname() || ''
  const [drawerOpen, setDrawerOpen] = useState(false)

  const isActive = (path: string) => {
    if (path === '/planning') return pathname.startsWith('/planning')
    if (path === '/contacts') return pathname === '/contacts' || pathname.startsWith('/contacts/')
    if (path === '/scan') return pathname.startsWith('/scan')
    if (path === '/search') return pathname.startsWith('/search')
    return false
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    router.push('/login')
  }

  const navigate = (path: string) => {
    setDrawerOpen(false)
    router.push(path)
  }

  const tabs: Array<{
    key: string
    path: string
    label: string
    icon: React.ReactNode
    emphasize?: boolean
  }> = [
    {
      key: 'planning',
      path: '/planning',
      label: 'Planning',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <path d="M16 2v4M8 2v4M3 10h18" />
        </svg>
      ),
    },
    {
      key: 'contacts',
      path: '/contacts',
      label: 'Contacts',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
        </svg>
      ),
    },
    {
      key: 'scan',
      path: '/scan',
      label: 'Scan',
      emphasize: true,
      icon: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
          <circle cx="12" cy="13" r="4" />
        </svg>
      ),
    },
    {
      key: 'search',
      path: '/search',
      label: 'Rechercher',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <circle cx="11" cy="11" r="8" />
          <path d="M21 21l-4.35-4.35" />
        </svg>
      ),
    },
  ]

  return (
    <>
      {/* Bottom nav */}
      <nav className="fixed bottom-0 inset-x-0 bg-white border-t border-line z-40 pb-safe">
        <div className="flex items-end justify-around px-2 pt-1.5 pb-2">
          {tabs.map((t) => {
            const active = isActive(t.path)
            if (t.emphasize) {
              return (
                <button
                  key={t.key}
                  onClick={() => router.push(t.path)}
                  className="flex flex-col items-center gap-1 flex-1 min-w-0"
                  aria-label={t.label}
                >
                  <span
                    className="w-14 h-14 rounded-full flex items-center justify-center -mt-7 ring-4 ring-white transition-all text-white"
                    style={{
                      backgroundColor: active ? '#00955F' : '#00B074',
                      boxShadow: '0 8px 20px rgba(0,176,116,0.45)',
                    }}
                  >
                    {t.icon}
                  </span>
                  <span className="text-[11px] font-bold mt-0.5" style={{ color: active ? '#00B074' : '#1F2937' }}>
                    {t.label}
                  </span>
                </button>
              )
            }
            return (
              <button
                key={t.key}
                onClick={() => router.push(t.path)}
                className="flex flex-col items-center gap-1 flex-1 min-w-0 min-h-[52px]"
                aria-label={t.label}
              >
                <span className={active ? 'text-primary' : 'text-ink-muted'}>{t.icon}</span>
                <span className={`text-[11px] font-medium ${active ? 'text-primary' : 'text-ink-soft'}`}>{t.label}</span>
              </button>
            )
          })}
          <button
            onClick={() => setDrawerOpen(true)}
            className="flex flex-col items-center gap-1 flex-1 min-w-0 min-h-[52px]"
            aria-label="Plus"
          >
            <span className="text-ink-muted">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="5" cy="12" r="1.75" />
                <circle cx="12" cy="12" r="1.75" />
                <circle cx="19" cy="12" r="1.75" />
              </svg>
            </span>
            <span className="text-[11px] font-medium text-ink-soft">Plus</span>
          </button>
        </div>
      </nav>

      {/* Drawer "Plus" */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50" onClick={() => setDrawerOpen(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div className="absolute bottom-0 inset-x-0 bg-white rounded-t-2xl shadow-xl flex flex-col p-4 pb-safe"
               onClick={(e) => e.stopPropagation()}>
            {/* Handle */}
            <div className="w-12 h-1 bg-line rounded-full mx-auto mb-4" />

            {/* User */}
            <div className="flex items-center gap-3 p-3 bg-surface-2 rounded-2xl mb-3">
              <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-bold text-sm">
                {prenom?.[0] || ''}{nom?.[0] || ''}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-ink truncate">{prenom} {nom}</p>
                <p className="text-xs text-ink-muted">{role === 'admin' ? 'Administrateur' : 'Commercial'}</p>
              </div>
            </div>

            <button onClick={() => navigate('/planning')}
              className="flex items-center gap-3 p-3 rounded-xl text-ink hover:bg-surface-2 text-left min-h-[48px]">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" />
              </svg>
              <span className="font-medium">Mon planning</span>
            </button>

            <button onClick={() => navigate('/change-password')}
              className="flex items-center gap-3 p-3 rounded-xl text-ink hover:bg-surface-2 text-left min-h-[48px]">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="11" width="18" height="11" rx="2" />
                <path d="M7 11V7a5 5 0 0110 0v4" />
              </svg>
              <span className="font-medium">Changer mot de passe</span>
            </button>

            <button onClick={() => navigate('/onboarding/axonaut-key')}
              className="flex items-center gap-3 p-3 rounded-xl text-ink hover:bg-surface-2 text-left min-h-[48px]">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
              </svg>
              <span className="font-medium">Clé API Axonaut</span>
            </button>

            {role === 'admin' && (
              <button onClick={() => navigate('/admin')}
                className="flex items-center gap-3 p-3 rounded-xl text-ink hover:bg-surface-2 text-left min-h-[48px]">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
                </svg>
                <span className="font-medium">Administration</span>
              </button>
            )}

            <div className="border-t border-line my-2" />

            <button onClick={handleLogout}
              className="flex items-center gap-3 p-3 rounded-xl text-red-600 hover:bg-red-50 text-left min-h-[48px]">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
              </svg>
              <span className="font-medium">Se déconnecter</span>
            </button>

            <p className="text-[11px] text-ink-muted text-center mt-3">v0.5.0</p>
          </div>
        </div>
      )}
    </>
  )
}
