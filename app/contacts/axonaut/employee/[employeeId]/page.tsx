'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'

export default function EmployeeRedirectPage() {
  const router = useRouter()
  const params = useParams()
  const employeeId = params?.employeeId as string
  const [error, setError] = useState('')
  const [user, setUser] = useState<{ prenom: string; nom: string; role: string } | null>(null)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      router.replace('/login')
      return
    }
    const stored = localStorage.getItem('user')
    if (stored) setUser(JSON.parse(stored))

    const resolve = async () => {
      try {
        const res = await fetch(`/api/axonaut/employee/${employeeId}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) {
          const d = await res.json()
          throw new Error(d.error || 'Erreur')
        }
        const { employee } = await res.json()
        if (!employee?.company_id) {
          throw new Error('Ce contact n\'est rattaché à aucune entreprise.')
        }
        router.replace(
          `/contacts/axonaut/company/${employee.company_id}?employee=${employee.id}`
        )
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Impossible de charger le contact')
      }
    }
    if (employeeId) resolve()
  }, [employeeId, router])

  return (
    <div className="min-h-screen bg-page">
      <Navbar prenom={user?.prenom} nom={user?.nom} role={user?.role} />
      <div className="p-8 flex flex-col items-center justify-center gap-4">
        {error ? (
          <>
            <p className="text-red-700 text-sm">{error}</p>
            <button
              onClick={() => router.back()}
              className="text-primary font-medium"
            >
              ← Retour
            </button>
          </>
        ) : (
          <>
            <div className="w-8 h-8 border-[3px] border-primary/20 border-t-primary rounded-full animate-spin" />
            <p className="text-sm text-secondary">Ouverture de la fiche…</p>
          </>
        )}
      </div>
    </div>
  )
}
