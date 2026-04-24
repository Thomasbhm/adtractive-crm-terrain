import OpenAI from 'openai'

export function getOpenAIClient(apiKey?: string): OpenAI {
  const key = apiKey || process.env.OPENAI_API_KEY
  if (!key) {
    throw new Error('Clé API OpenAI non configurée')
  }
  return new OpenAI({ apiKey: key })
}

export async function extractCardData(
  openai: OpenAI,
  imageBase64: string,
  mimeType: string
): Promise<{ contacts: Array<Record<string, string>> }> {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content:
          'Tu es un assistant spécialisé dans l\'extraction de données de cartes de visite. Tu reçois une image de carte de visite et tu dois extraire toutes les informations de contact présentes. Tu réponds UNIQUEMENT avec un objet JSON valide, sans texte avant ni après, sans balises markdown, sans explication.',
      },
      {
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: {
              url: `data:${mimeType};base64,${imageBase64}`,
              detail: 'low', // mode rapide — largement suffisant pour lire du texte sur une carte
            },
          },
          {
            type: 'text',
            text: `Analyse cette carte de visite et extrait toutes les informations de contact visibles.

Retourne un JSON avec exactement cette structure :
{
  "contacts": [
    {
      "prenom": "",
      "nom": "",
      "societe": "",
      "poste": "",
      "email": "",
      "telephone": "",
      "telephone_2": "",
      "adresse": "",
      "site_web": "",
      "linkedin": ""
    }
  ]
}

Règles :
- Si plusieurs personnes sont présentes sur la carte, crée un objet par personne dans le tableau contacts
- Si la société semble être partagée entre tous les contacts de la carte, assigne-la à chacun
- Si un champ n'est pas visible sur la carte, laisse la valeur en chaîne vide ""
- N'invente aucune information
- Normalise les numéros de téléphone en conservant le format d'origine`,
          },
        ],
      },
    ],
    max_tokens: 400, // une carte de visite ne dépasse jamais 300 tokens — on réduit pour aller plus vite
  })

  const content = response.choices[0]?.message?.content || ''
  const cleaned = content.replace(/```json|```/g, '').trim()

  try {
    return JSON.parse(cleaned)
  } catch {
    throw new Error('Impossible d\'analyser la carte, veuillez réessayer')
  }
}
