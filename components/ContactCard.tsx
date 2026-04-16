'use client'

import { useRouter } from 'next/navigation'
import Badge from './ui/Badge'
import Card from './ui/Card'

interface ContactCardProps {
  contact: {
    _id: string
    prenom: string
    nom: string
    societe: string
    source: 'scan_carte' | 'manuel'
    axonaut_synced: boolean
    axonaut_company_id?: string
    scanned_at: string
  }
}

function resolveRoute(c: ContactCardProps['contact']): string {
  if (c.axonaut_synced && c.axonaut_company_id) {
    return `/contacts/axonaut/company/${c.axonaut_company_id}`
  }
  return `/contacts/local/${c._id}`
}

const colors = ['#1B2B6B', '#F5C842', '#6B7280', '#059669', '#DC2626', '#7C3AED']

function getInitialsColor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
}

export default function ContactCard({ contact }: ContactCardProps) {
  const router = useRouter()
  const fullName = `${contact.prenom} ${contact.nom}`.trim()
  const initials = `${contact.prenom?.[0] || ''}${contact.nom?.[0] || ''}`.toUpperCase()

  return (
    <Card onClick={() => router.push(resolveRoute(contact))} className="flex items-center gap-3">
      <div
        className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
        style={{ backgroundColor: getInitialsColor(fullName) }}
      >
        {initials || '?'}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-900 truncate">{fullName || 'Sans nom'}</p>
        {contact.societe && <p className="text-sm text-gray-500 truncate">{contact.societe}</p>}
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <Badge variant={contact.source === 'scan_carte' ? 'accent' : 'primary'}>
            {contact.source === 'scan_carte' ? 'Scan' : 'Manuel'}
          </Badge>
          {contact.axonaut_synced ? (
            <Badge variant="green">Axonaut ✓</Badge>
          ) : (
            <Badge variant="orange">Non synchronisé</Badge>
          )}
          <span className="text-xs text-gray-400">
            {new Date(contact.scanned_at).toLocaleDateString('fr-FR')}
          </span>
        </div>
      </div>
      <svg className="w-5 h-5 text-gray-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
      </svg>
    </Card>
  )
}
