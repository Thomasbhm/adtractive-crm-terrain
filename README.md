# ADtractive CRM Terrain

CRM terrain mobile-first pour les commerciaux d'ADtractive Media. Permet de scanner des cartes de visite (OCR via GPT-4o mini Vision), saisir manuellement des contacts, ajouter des notes et créer des tâches de suivi.

## Roadmap

| Version | Fonctionnalités |
|---------|----------------|
| v0.1 | Scan carte + OCR + saisie manuelle + formulaire + stockage MongoDB + interface mobile |
| v0.2 | Intégration API Axonaut |
| **v0.3** (actuelle) | Notes vocales + transcription (Mistral Voxtral) |
| v0.4 | Dashboard admin + gestion avancée des commerciaux |

## Prérequis

- Node.js 18+
- MongoDB (instance accessible)
- MinIO (instance accessible via HTTPS)
- Clé API OpenAI (pour l'OCR GPT-4o mini Vision)

## Installation

```bash
npm install
```

## Configuration

1. Copier le fichier d'exemple :

```bash
cp .env.example .env.local
```

2. Remplir les variables dans `.env.local` :

| Variable | Description |
|----------|-------------|
| `MONGODB_URI` | URI de connexion MongoDB |
| `MINIO_ENDPOINT` | URL MinIO (ex: `https://minio.example.com`) |
| `MINIO_ACCESS_KEY` | Clé d'accès MinIO |
| `MINIO_SECRET_KEY` | Clé secrète MinIO |
| `MINIO_BUCKET` | Nom du bucket (défaut: `crm-terrain`) |
| `OPENAI_API_KEY` | Clé API OpenAI |
| `JWT_SECRET` | Secret pour signer les JWT (chaîne longue aléatoire) |
| `AES_SECRET` | Clé AES-256 (exactement 32 caractères) |
| `MISTRAL_API_KEY` | Clé API Mistral AI pour la transcription vocale (https://console.mistral.ai) |

## Seed (données initiales)

```bash
npx ts-node scripts/seed.ts
```

Crée :
- 1 organisation : ADtractive Media
- 1 admin : `admin@adtractive.fr` / `Admin2024!`
- 1 commercial : `commercial@adtractive.fr` / `Commercial2024!`

## Démarrage

```bash
npm run dev
```

L'application sera accessible sur [http://localhost:3000](http://localhost:3000).

## Déploiement Vercel

1. Connecter le repo GitHub à Vercel
2. Configurer les variables d'environnement dans les settings Vercel
3. Déployer

Aucune configuration spéciale requise — le projet est compatible Vercel nativement.

## Stack technique

- **Framework** : Next.js 14 (App Router)
- **Base de données** : MongoDB
- **Stockage images** : MinIO
- **OCR** : OpenAI GPT-4o mini Vision
- **Transcription vocale** : Mistral AI Voxtral Mini Transcribe V2
- **Auth** : JWT (bcrypt)
- **Styling** : Tailwind CSS
- **PWA** : manifest.json + meta tags

## Version

v0.3.0
