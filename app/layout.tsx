import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'ADtractive CRM Terrain',
  description: 'CRM terrain pour les commerciaux ADtractive Media',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'CRM Terrain',
  },
}

export const viewport: Viewport = {
  themeColor: '#1B2B6B',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body className="bg-page text-gray-900 min-h-screen">
        {children}
      </body>
    </html>
  )
}
