'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import Scanner from '@/components/Scanner'
import ContactForm from '@/components/ContactForm'
import Toast from '@/components/ui/Toast'

type View = 'home' | 'scanner' | 'form-scan' | 'form-manual'

interface ScanResult {
  contacts: Array<Record<string, string>>
  image_url: string
}

export default function ScanPage() {
  const router = useRouter()
  const [view, setView] = useState<View>('home')
  const [user, setUser] = useState<{ prenom: string; nom: string; role: string } | null>(null)
  const [scanResult, setScanResult] = useState<ScanResult | null>(null)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  useEffect(() => {
    const stored = localStorage.getItem('user')
    if (stored) setUser(JSON.parse(stored))
  }, [])

  const handleScanComplete = (data: ScanResult) => {
    setScanResult(data)
    setView('form-scan')
  }

  const handleScanError = (message: string) => {
    setToast({ message, type: 'error' })
  }

  const handleSaved = () => {
    setView('home')
    setToast({ message: 'Contact enregistré !', type: 'success' })
  }

  if (view === 'scanner') {
    return (
      <div className="min-h-screen bg-page">
        <Navbar prenom={user?.prenom} nom={user?.nom} role={user?.role} />
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        <Scanner onScanComplete={handleScanComplete} onError={handleScanError} />
        <div className="p-4">
          <button onClick={() => setView('home')} className="text-primary text-sm font-medium min-h-[48px] flex items-center">
            ← Retour
          </button>
        </div>
      </div>
    )
  }

  if (view === 'form-scan' && scanResult) {
    return (
      <div className="min-h-screen bg-page">
        <Navbar prenom={user?.prenom} nom={user?.nom} role={user?.role} />
        <ContactForm mode="scan" contacts={scanResult.contacts} imageUrl={scanResult.image_url} onBack={() => setView('home')} onSaved={handleSaved} />
      </div>
    )
  }

  if (view === 'form-manual') {
    return (
      <div className="min-h-screen bg-page">
        <Navbar prenom={user?.prenom} nom={user?.nom} role={user?.role} />
        <ContactForm mode="manuel" onBack={() => setView('home')} onSaved={handleSaved} />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-page">
      <Navbar prenom={user?.prenom} nom={user?.nom} role={user?.role} />
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="flex flex-col items-center px-6 pt-16 gap-6">
        <h2 className="text-2xl font-bold text-primary text-center">Nouveau contact</h2>
        <p className="text-secondary text-sm text-center max-w-xs">
          Scannez une carte de visite ou saisissez les informations manuellement.
        </p>

        <div className="w-full max-w-sm flex flex-col gap-4 mt-4">
          <button
            onClick={() => setView('scanner')}
            className="w-full h-[64px] bg-accent text-primary font-semibold rounded-full px-6 flex items-center justify-center gap-3 text-[17px] shadow-accent hover:bg-accent/90 transition-all active:scale-[0.98]"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Scanner une carte de visite
          </button>

          <button
            onClick={() => setView('form-manual')}
            className="w-full h-[64px] bg-primary text-white font-semibold rounded-full px-6 flex items-center justify-center gap-3 text-[17px] shadow-btn hover:bg-primary/90 transition-all active:scale-[0.98]"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
            Saisir manuellement
          </button>
        </div>

        {/* Lien vers contacts */}
        <button
          onClick={() => router.push('/contacts')}
          className="mt-6 flex items-center gap-2 text-secondary text-sm hover:text-primary transition-colors min-h-[48px] px-4"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
          </svg>
          Voir mes contacts
        </button>
      </div>
    </div>
  )
}
