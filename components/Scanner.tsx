'use client'

import { useRef, useState } from 'react'
import Button from './ui/Button'
import Spinner from './ui/Spinner'

interface ScannerProps {
  onScanComplete: (data: { contacts: Array<Record<string, string>>; image_url: string }) => void
  onError: (message: string) => void
}

export default function Scanner({ onScanComplete, onError }: ScannerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)

  const handleCapture = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setSelectedFile(file)
    const reader = new FileReader()
    reader.onload = () => setPreview(reader.result as string)
    reader.readAsDataURL(file)
  }

  const handleAnalyze = async () => {
    if (!selectedFile) return
    setLoading(true)

    try {
      const token = localStorage.getItem('token')
      const formData = new FormData()
      formData.append('image', selectedFile)

      const res = await fetch('/api/ocr/scan', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Erreur lors de l\'analyse')
      }

      onScanComplete(data)
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Erreur lors de l\'analyse')
    } finally {
      setLoading(false)
    }
  }

  const handleRetry = () => {
    setPreview(null)
    setSelectedFile(null)
  }

  if (loading) {
    return <Spinner message="Analyse en cours..." />
  }

  return (
    <div className="flex flex-col items-center gap-6 p-4">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />

      {!preview ? (
        <Button variant="accent" size="lg" fullWidth onClick={handleCapture}>
          <svg className="w-6 h-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Prendre une photo
        </Button>
      ) : (
        <>
          <div className="w-full rounded-xl overflow-hidden border-2 border-gray-200">
            <img src={preview} alt="Carte de visite" className="w-full object-contain" />
          </div>

          <div className="w-full flex flex-col gap-3">
            <Button variant="accent" size="lg" fullWidth onClick={handleAnalyze}>
              Analyser cette carte
            </Button>
            <Button variant="outline" size="md" fullWidth onClick={handleRetry}>
              Reprendre la photo
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
