'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'
import Toast from '@/components/ui/Toast'

export default function OnboardingAxonautKeyPage() {
  const router = useRouter()
  const [apiKey, setApiKey] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [hasExistingKey, setHasExistingKey] = useState(false)
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      router.replace('/login')
      return
    }

    // Récupérer la clé existante
    const fetchKey = async () => {
      try {
        const res = await fetch('/api/user/axonaut-key', {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
        })
        if (res.ok) {
          const { apiKey: existingKey, isSet } = await res.json()
          if (existingKey) setApiKey(existingKey)
          setHasExistingKey(!!isSet)
        }
      } catch {
        // silencieux — on laisse l'utilisateur saisir
      } finally {
        setFetching(false)
      }
    }
    fetchKey()
  }, [router])

  const handleSubmit = async () => {
    if (!apiKey.trim()) return
    setLoading(true)

    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/user/axonaut-key', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ apiKey: apiKey.trim() }),
      })

      const data = await res.json()

      if (!res.ok) {
        setToast({ message: data.error || 'Erreur', type: 'error' })
        return
      }

      // Mettre à jour le localStorage
      const stored = localStorage.getItem('user')
      if (stored) {
        const user = JSON.parse(stored)
        user.axonaut_api_key_set = true
        localStorage.setItem('user', JSON.stringify(user))
      }

      setToast({ message: 'Clé API validée !', type: 'success' })
      // Si c'est un premier enregistrement → planning, sinon on revient à la page précédente
      if (hasExistingKey) {
        setTimeout(() => router.back(), 800)
      } else {
        setTimeout(() => router.replace('/planning'), 1000)
      }
    } catch {
      setToast({ message: 'Erreur de connexion', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const handleBack = () => {
    router.back()
  }

  return (
    <div className="min-h-screen bg-page">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Header avec back arrow si clé déjà existante */}
      {hasExistingKey && (
        <header className="bg-white px-4 h-14 flex items-center sticky top-0 z-30 border-b border-line">
          <button
            onClick={handleBack}
            aria-label="Retour"
            className="min-h-[48px] min-w-[48px] flex items-center justify-center -ml-2"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1B2B6B" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-base font-semibold text-primary ml-1">Clé API Axonaut</h1>
        </header>
      )}

      <div className={`flex flex-col items-center p-4 ${hasExistingKey ? 'pt-6' : 'pt-16'}`}>
        <div className="w-full max-w-md">
          {/* Logo (seulement en onboarding initial) */}
          {!hasExistingKey && (
            <div className="text-center mb-8">
              <img
                src="https://media.adtractive-group.fr/wp-content/uploads/2024/04/8c7871c3-48ee-4ea1-a4b2-c592230cda85-removebg-preview.png"
                alt="ADtractive"
                className="h-12 w-auto mx-auto mb-4"
              />
              <h1 className="text-2xl font-bold text-primary">Bienvenue sur CRM Terrain</h1>
              <p className="text-secondary mt-2">
                Pour utiliser l&apos;application, vous devez connecter votre compte Axonaut.
              </p>
            </div>
          )}

          {/* Loading de la clé existante */}
          {fetching ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-[3px] border-primary/20 border-t-primary rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {/* API Key input */}
              <div className="bg-white rounded-2xl p-5 shadow-card border border-gray-100 mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <span className="flex items-center gap-2">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1B2B6B" strokeWidth="2">
                      <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
                    </svg>
                    {hasExistingKey ? 'Clé API actuelle' : 'Votre clé API Axonaut'}
                  </span>
                </label>
                <div className="relative">
                  <input
                    type={showKey ? 'text' : 'password'}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder={hasExistingKey ? '' : 'Collez votre clé API ici...'}
                    className="w-full px-4 pr-12 py-3 min-h-[48px] border-[1.5px] border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    aria-label={showKey ? 'Masquer' : 'Afficher'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 min-w-[44px] min-h-[44px] flex items-center justify-center"
                  >
                    {showKey ? (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
                {hasExistingKey && (
                  <p className="text-xs text-ink-muted mt-2">
                    Cliquez sur l&apos;œil pour afficher la clé. Modifiez-la si besoin puis validez.
                  </p>
                )}
              </div>

              {/* Instructions — seulement si pas de clé actuelle */}
              {!hasExistingKey && (
                <div className="bg-white rounded-2xl p-5 shadow-card border border-gray-100 mb-6">
                  <h3 className="font-semibold text-primary mb-3">Comment trouver votre clé API ?</h3>
                  <ol className="flex flex-col gap-2 text-sm text-secondary">
                    <li className="flex gap-2"><span className="font-bold text-primary">1.</span> Connectez-vous sur axonaut.com</li>
                    <li className="flex gap-2"><span className="font-bold text-primary">2.</span> Cliquez sur votre profil en haut à droite</li>
                    <li className="flex gap-2"><span className="font-bold text-primary">3.</span> Allez dans la section &quot;API&quot;</li>
                    <li className="flex gap-2"><span className="font-bold text-primary">4.</span> Cliquez sur &quot;Afficher ma clé API&quot;</li>
                    <li className="flex gap-2"><span className="font-bold text-primary">5.</span> Copiez-collez la clé ici</li>
                  </ol>

                  <a
                    href="https://axonaut.com/utilities/api"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 mt-4 text-sm font-medium text-primary hover:underline"
                  >
                    Ouvrir Axonaut
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" />
                    </svg>
                  </a>
                </div>
              )}

              {/* Submit button */}
              <Button
                variant="primary"
                size="lg"
                fullWidth
                className="shadow-btn"
                onClick={handleSubmit}
                disabled={loading || !apiKey.trim()}
              >
                {loading
                  ? 'Validation en cours...'
                  : hasExistingKey
                  ? 'Mettre à jour la clé'
                  : 'Valider et continuer'}
              </Button>

              {!hasExistingKey && (
                <p className="text-xs text-center text-secondary mt-4">
                  Sans clé API, vous ne pouvez pas synchroniser vos contacts avec Axonaut.
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
