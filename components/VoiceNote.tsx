'use client'

import { useState, useRef, useEffect } from 'react'

type VoiceNoteState = 'idle' | 'recording' | 'processing' | 'done' | 'error' | 'rate_limited'

interface VoiceNoteProps {
  onTextReady: (text: string) => void
}

export default function VoiceNote({ onTextReady }: VoiceNoteProps) {
  const [state, setState] = useState<VoiceNoteState>('idle')
  const [transcript, setTranscript] = useState('')
  const [duration, setDuration] = useState(0)
  const [countdown, setCountdown] = useState(0)
  const [errorMessage, setErrorMessage] = useState('')

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<BlobPart[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
      }
    }
  }, [])

  // Countdown rate limit
  useEffect(() => {
    if (state === 'rate_limited' && countdown > 0) {
      const timer = setTimeout(() => setCountdown((c) => c - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [state, countdown])

  const startRecording = async () => {
    // Vérifier que MediaDevices est disponible
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setErrorMessage('Votre navigateur ne supporte pas l\'enregistrement audio. Utilisez un navigateur récent en HTTPS.')
      setState('error')
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      // Choisir le format supporté
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : 'audio/mp4'

      const mediaRecorder = new MediaRecorder(stream, { mimeType })
      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: mimeType })
        stream.getTracks().forEach((track) => track.stop())
        await transcribeAudio(blob, mimeType)
      }

      mediaRecorder.start(250)
      setState('recording')
      setDuration(0)

      // Compteur
      timerRef.current = setInterval(() => {
        setDuration((prev) => {
          if (prev >= 119) {
            stopRecording()
            return 120
          }
          return prev + 1
        })
      }, 1000)
    } catch {
      setErrorMessage('Accès au microphone refusé. Saisissez votre note manuellement.')
      setState('error')
    }
  }

  const stopRecording = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop()
    }
    setState('processing')
  }

  const transcribeAudio = async (blob: Blob, mimeType: string) => {
    try {
      const formData = new FormData()
      const extension = mimeType.includes('mp4') ? 'mp4' : 'webm'
      formData.append('audio', blob, `recording.${extension}`)

      const token = localStorage.getItem('token')
      const response = await fetch('/api/audio/transcribe', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      })

      const data = await response.json()

      if (response.status === 429) {
        setState('rate_limited')
        setCountdown(10)
        return
      }

      if (!response.ok) {
        setErrorMessage(data.message || 'La transcription a échoué. Veuillez réessayer.')
        setState('error')
        return
      }

      if (!data.text || data.text.trim() === '') {
        setErrorMessage('Aucune parole détectée. Veuillez réenregistrer.')
        setState('error')
        return
      }

      setTranscript(data.text)
      setState('done')
    } catch {
      if (!navigator.onLine) {
        setErrorMessage('Connexion internet requise pour la transcription.')
      } else {
        setErrorMessage('La transcription a échoué. Veuillez réessayer.')
      }
      setState('error')
    }
  }

  const handleUseText = () => {
    onTextReady(transcript)
    reset()
  }

  const reset = () => {
    setState('idle')
    setTranscript('')
    setDuration(0)
    setErrorMessage('')
  }

  const formatDuration = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  const progressPercent = (duration / 120) * 100

  return (
    <div className="flex flex-col items-center gap-3">
      {/* State: idle */}
      {state === 'idle' && (
        <>
          <button
            onClick={startRecording}
            className="w-[72px] h-[72px] rounded-full bg-primary flex items-center justify-center shadow-lg hover:bg-primary/90 transition-all active:scale-95"
            aria-label="Appuyer pour enregistrer"
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" />
              <line x1="12" y1="19" x2="12" y2="23" stroke="white" strokeWidth="2" strokeLinecap="round" />
              <line x1="8" y1="23" x2="16" y2="23" stroke="white" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
          <p className="text-sm text-secondary">Appuyer pour enregistrer</p>
        </>
      )}

      {/* State: recording */}
      {state === 'recording' && (
        <>
          <button
            onClick={stopRecording}
            className="w-[72px] h-[72px] rounded-full bg-red-500 flex items-center justify-center shadow-lg animate-pulse"
            aria-label="Arrêter l'enregistrement"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
              <rect x="6" y="6" width="12" height="12" rx="2" />
            </svg>
          </button>
          <p className="text-sm font-medium text-red-500">
            Enregistrement... {formatDuration(duration)}
          </p>
          {/* Progress bar */}
          <div className="w-full max-w-[200px] h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-red-500 rounded-full transition-all duration-1000"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          {duration >= 120 && (
            <p className="text-xs text-orange-500 font-medium">Durée maximale atteinte (2 min)</p>
          )}
        </>
      )}

      {/* State: processing */}
      {state === 'processing' && (
        <>
          <div className="w-[72px] h-[72px] rounded-full bg-gray-200 flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          </div>
          <p className="text-sm text-secondary font-medium">Transcription en cours...</p>
        </>
      )}

      {/* State: done */}
      {state === 'done' && (
        <>
          <div className="w-[48px] h-[48px] rounded-full bg-green-100 flex items-center justify-center">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.5">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </div>
          <textarea
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            className="w-full bg-gray-50 rounded-xl p-3 text-sm text-gray-900 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary resize-y min-h-[80px]"
          />
          <div className="flex gap-2 w-full">
            <button
              onClick={reset}
              className="flex-1 px-4 py-2.5 min-h-[44px] border-[1.5px] border-primary text-primary font-medium rounded-full text-sm hover:bg-primary/5 transition-colors"
            >
              Réenregistrer
            </button>
            <button
              onClick={handleUseText}
              className="flex-1 px-4 py-2.5 min-h-[44px] bg-primary text-white font-medium rounded-full text-sm hover:bg-primary/90 transition-colors"
            >
              Utiliser ce texte
            </button>
          </div>
        </>
      )}

      {/* State: error */}
      {state === 'error' && (
        <>
          <div className="w-[48px] h-[48px] rounded-full bg-red-100 flex items-center justify-center">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2.5">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </div>
          <p className="text-sm text-red-600 text-center">{errorMessage}</p>
          <button
            onClick={reset}
            className="px-6 py-2.5 min-h-[44px] border-[1.5px] border-red-500 text-red-500 font-medium rounded-full text-sm hover:bg-red-50 transition-colors"
          >
            Réessayer
          </button>
        </>
      )}

      {/* State: rate_limited */}
      {state === 'rate_limited' && (
        <>
          <div className="w-[48px] h-[48px] rounded-full bg-orange-100 flex items-center justify-center">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12,6 12,12 16,14" />
            </svg>
          </div>
          <p className="text-sm text-orange-600 text-center">
            Trop de requêtes en cours. Patientez quelques secondes et réessayez.
          </p>
          <button
            onClick={() => {
              if (countdown <= 0) reset()
            }}
            disabled={countdown > 0}
            className="px-6 py-2.5 min-h-[44px] border-[1.5px] border-orange-500 text-orange-500 font-medium rounded-full text-sm hover:bg-orange-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {countdown > 0 ? `Réessayer dans ${countdown}s` : 'Réessayer'}
          </button>
        </>
      )}
    </div>
  )
}
