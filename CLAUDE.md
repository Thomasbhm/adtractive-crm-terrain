# ADtractive CRM Terrain — Contexte projet

## Règles impératives
- **JAMAIS push/deploy sur GitHub sans permission explicite de l'utilisateur**
- Toujours lire `tasks/lessons.md` et `tasks/todo.md` en début de session
- Ne jamais inventer des noms de modèles API — vérifier la doc réelle

## Stack technique
- **Framework :** Next.js 14 (App Router)
- **Base de données :** MongoDB (db: `crm-terrain`)
- **Stockage images :** MinIO (S3-compatible, endpoint: `minio.authomations.com`)
- **OCR :** OpenAI GPT-4o mini Vision
- **Transcription vocale :** Mistral AI Voxtral
- **Auth :** JWT + bcrypt
- **Styling :** Tailwind CSS (primary: #1B2B6B, accent: #F5C842)
- **Chiffrement :** AES-256-CBC pour les clés API en base

## Fonctionnalités (v0.4.0)

### v0.1 — Base
- Authentification JWT (rôles admin/commercial), login, changement mot de passe obligatoire
- Scan OCR carte de visite (GPT-4o mini Vision), multi-contacts sur une carte
- Saisie manuelle de contacts
- Upload images sur MinIO
- Liste contacts avec recherche, fiche contact éditable
- Tâches/rappels (rappel, email, réunion, devis, autre)
- Admin : config clés API, création utilisateurs, stats mensuelles

### v0.2 — Intégration Axonaut
- Service Axonaut (`lib/axonaut.ts`) : search/create company, create/update/delete employee, create note, create task
- Sync automatique à l'enregistrement du contact
- Autocomplétion société depuis Axonaut (debounce 400ms)
- Détection doublons Axonaut avant sauvegarde
- Bouton sync sur fiche contact (états: en cours / synchronisé ✓ / erreur)
- Suppression : choix "app seule" ou "app + Axonaut"
- Badge sync dans liste contacts (vert/orange)

### v0.3 — Notes vocales
- Enregistrement audio (max 2min, format webm/mp4)
- Transcription via Mistral Voxtral
- États visuels : idle, recording, processing, done, error, rate_limited
- Intégration dans ContactForm : "Utiliser ce texte" → append dans note

### v0.4 — Clé API par utilisateur + Recherche Axonaut
- Clé API Axonaut par utilisateur (migrée depuis Organization vers User)
- Onboarding forcé : page `/onboarding/axonaut-key` après première connexion
- Test de validité de la clé via `GET /api/v2/me` avant sauvegarde
- Page recherche Axonaut (`/search`) : recherche contacts + entreprises en parallèle
- Redirection vers fiches Axonaut dans un nouvel onglet
- Fix : sync note/tâche sur contact déjà synchronisé (utilise IDs existants)
- syncUpdatesToAxonaut() : sync incrémentale sans recréer company/employee

## Structure fichiers clés

```
app/api/auth/            → login, me, change-password
app/api/contacts/        → CRUD contacts + [id]
app/api/ocr/scan/        → OCR GPT-4o mini
app/api/audio/           → transcribe (Mistral)
app/api/axonaut/         → sync, companies, search
app/api/user/            → axonaut-key
app/api/admin/           → users, settings, stats
app/onboarding/          → axonaut-key (onboarding forcé)
app/search/              → recherche Axonaut
components/              → Navbar, Scanner, ContactForm, ContactCard, VoiceNote, TaskForm, UI (Button, Input, Badge, Toast, Modal, Card, Spinner)
lib/                     → auth, mongodb, minio, openai, axonaut, crypto
models/                  → User, Contact, Organization
```

## Variables d'environnement (9)
MONGODB_URI, MINIO_ENDPOINT, MINIO_ACCESS_KEY, MINIO_SECRET_KEY, MINIO_BUCKET, OPENAI_API_KEY, JWT_SECRET, AES_SECRET, MISTRAL_API_KEY

## Utilisateurs seed
- Admin : `admin@adtractive.fr` / `Admin2024!`
- Commercial : `commercial@adtractive.fr` / `Commercial2024!`

## Architecture clé API Axonaut (v0.4+)
- Clé stockée dans `User.axonaut_api_key` (chiffré AES-256)
- `User.axonaut_api_key_set` : flag boolean pour onboarding
- `getUserAxonautKey(userId)` dans `lib/axonaut.ts` : helper centralisé
- Onboarding forcé après login si `axonaut_api_key_set === false`

## API Axonaut — Points critiques
- Header auth : `userApiKey` (pas Bearer)
- Base URL : `https://axonaut.com/api/v2`
- Dates Events : RFC3339 sans millisecondes
- Dates Tasks : DD/MM/YYYY
- POST /employees requiert company_id
- Employees ≠ Workforces
- Pagination : header `page`
