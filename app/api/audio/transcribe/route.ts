import { NextRequest, NextResponse } from 'next/server'
import { getTokenFromRequest, verifyToken } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    // Vérifier JWT
    const token = getTokenFromRequest(req)
    if (!token) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    try {
      verifyToken(token)
    } catch {
      return NextResponse.json({ error: 'Token invalide' }, { status: 401 })
    }

    const formData = await req.formData()
    const audioFile = formData.get('audio') as File

    if (!audioFile) {
      return NextResponse.json({ error: 'Fichier audio manquant' }, { status: 400 })
    }

    // Préparer le formData pour Mistral
    const mistralFormData = new FormData()
    mistralFormData.append('file', audioFile, 'audio.webm')
    mistralFormData.append('model', 'voxtral-mini-transcribe-2')
    mistralFormData.append('language', 'fr')
    mistralFormData.append('response_format', 'json')

    const response = await fetch('https://api.mistral.ai/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.MISTRAL_API_KEY}`,
      },
      body: mistralFormData,
    })

    // Gestion spécifique du rate limit
    if (response.status === 429) {
      return NextResponse.json(
        {
          error: 'rate_limit',
          message: 'Trop de requêtes envoyées. Veuillez patienter quelques secondes avant de réessayer.',
        },
        { status: 429 }
      )
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('Mistral transcription error:', errorData)
      return NextResponse.json(
        { error: 'transcription_failed', message: 'La transcription a échoué. Veuillez réessayer.' },
        { status: 500 }
      )
    }

    const data = await response.json()
    return NextResponse.json({ text: data.text || '' })
  } catch (error) {
    console.error('Transcription error:', error)
    return NextResponse.json(
      { error: 'server_error', message: 'Une erreur est survenue. Veuillez réessayer.' },
      { status: 500 }
    )
  }
}
