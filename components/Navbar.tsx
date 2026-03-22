'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Badge from './ui/Badge'

interface NavbarProps {
  prenom?: string
  nom?: string
  role?: string
}

export default function Navbar({ prenom, nom, role }: NavbarProps) {
  const router = useRouter()
  const [drawerOpen, setDrawerOpen] = useState(false)

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    router.push('/login')
  }

  const navigate = (path: string) => {
    setDrawerOpen(false)
    router.push(path)
  }

  return (
    <>
      {/* Navbar */}
      <nav className="bg-white text-primary px-4 py-3 flex items-center justify-between sticky top-0 z-40 shadow-navbar border-b border-gray-100">
        <div className="flex items-center gap-2">
          <img
            src="https://media.adtractive-group.fr/wp-content/uploads/2024/04/8c7871c3-48ee-4ea1-a4b2-c592230cda85-removebg-preview.png"
            alt="ADtractive"
            className="h-8 w-auto"
          />
        </div>

        <button
          onClick={() => setDrawerOpen(true)}
          className="min-h-[48px] min-w-[48px] flex items-center justify-center"
          aria-label="Menu"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1B2B6B" strokeWidth="2" strokeLinecap="round">
            <path d="M3 6h18M3 12h18M3 18h18" />
          </svg>
        </button>
      </nav>

      {/* Drawer overlay */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50" onClick={() => setDrawerOpen(false)}>
          <div className="absolute inset-0 bg-black/40" />

          {/* Drawer panel */}
          <div
            className="absolute right-0 top-0 h-full w-72 bg-white shadow-xl flex flex-col animate-slide-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* User info */}
            <div className="p-5 bg-primary text-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center text-primary font-bold text-sm">
                  {prenom?.[0] || ''}{nom?.[0] || ''}
                </div>
                <div>
                  <p className="font-semibold">{prenom} {nom}</p>
                  <Badge variant={role === 'admin' ? 'accent' : 'primary'} className="mt-1 text-[10px]">
                    {role === 'admin' ? 'Admin' : 'Commercial'}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Navigation links */}
            <div className="flex-1 py-2">
              <button
                onClick={() => navigate('/scan')}
                className="w-full flex items-center gap-3 px-5 py-4 text-left text-gray-700 hover:bg-gray-50 min-h-[56px]"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1B2B6B" strokeWidth="1.5">
                  <path d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <circle cx="12" cy="13" r="3" />
                </svg>
                <span className="font-medium">Scanner une carte</span>
              </button>

              <button
                onClick={() => navigate('/contacts')}
                className="w-full flex items-center gap-3 px-5 py-4 text-left text-gray-700 hover:bg-gray-50 min-h-[56px]"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1B2B6B" strokeWidth="1.5">
                  <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
                </svg>
                <span className="font-medium">Mes contacts</span>
              </button>

              {role === 'admin' && (
                <>
                  <div className="mx-5 my-2 border-t border-gray-100" />
                  <button
                    onClick={() => navigate('/admin')}
                    className="w-full flex items-center gap-3 px-5 py-4 text-left text-gray-700 hover:bg-gray-50 min-h-[56px]"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1B2B6B" strokeWidth="1.5">
                      <circle cx="12" cy="12" r="3" />
                      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
                    </svg>
                    <span className="font-medium">Administration</span>
                  </button>
                </>
              )}
            </div>

            {/* Logout + version */}
            <div className="border-t border-gray-100 p-4">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3 py-3 text-red-600 hover:bg-red-50 rounded-xl min-h-[48px]"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
                </svg>
                <span className="font-medium">Se déconnecter</span>
              </button>
              <p className="text-[11px] text-gray-400 text-center mt-3">v0.2.0</p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
