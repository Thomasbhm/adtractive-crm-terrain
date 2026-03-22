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

    // Vérifier que la clé API est configurée
    if (!process.env.MISTRAL_API_KEY) {
      console.error('MISTRAL_API_KEY is not defined in environment variables')
      return NextResponse.json(
        { error: 'config_error', message: 'Clé API Mistral non configurée.' },
        { status: 500 }
      )
    }

    console.log('Transcription request:', {
      fileSize: audioFile.size,
      fileType: audioFile.type,
      fileName: audioFile.name,
      apiKeyPresent: !!process.env.MISTRAL_API_KEY,
      apiKeyLength: process.env.MISTRAL_API_KEY.length,
    })

    // Préparer le formData pour Mistral
    const mistralFormData = new FormData()
    mistralFormData.append('file', audioFile, audioFile.name || 'audio.webm')
    mistralFormData.append('model', 'voxtral-mini-2602')
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
      const errorText = await response.text()
      console.error('Mistral API error:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText,
      })
      return NextResponse.json(
        { error: 'transcription_failed', message: `Transcription échouée (${response.status}): ${errorText}` },
        { status: 500 }
      )
    }

    const data = await response.json()
    console.log('Transcription success, text length:', data.text?.length || 0)
    return NextResponse.json({ text: data.text || '' })
  } catch (error) {
    console.error('Transcription error:', error)
    return NextResponse.json(
      { error: 'server_error', message: 'Une erreur est survenue. Veuillez réessayer.' },
      { status: 500 }
    )
  }
}
