# Leçons apprises

## Déploiement
- **JAMAIS push/deploy sur GitHub sans permission explicite de l'utilisateur**

## API Axonaut
- Header auth : `userApiKey` uniquement (pas Bearer, pas Authorization)
- Dates Events/Companies : RFC3339 sans millisecondes (`2026-03-22T14:30:00+01:00`)
- Dates Tasks : `DD/MM/YYYY` (format différent des autres)
- POST /employees requiert `company_id` obligatoirement
- Employees = contacts clients / Workforces = employés internes
- Pagination : header `page` (integer), pas un query param

## API Mistral (Transcription vocale)
- Modèle correct : `mistral-small-latest` pour transcription (vérifier le nom exact du modèle avant d'appeler)
- `voxtral-mini-transcribe-2` n'existe pas — toujours vérifier les noms de modèles dans la doc officielle
- Plan Experiment limité à 2 req/minute — prévoir countdown 10s minimum

## MinIO
- Appliquer la policy publique sur le bucket systématiquement
- Fallback si image cassée sur fiche contact

## Next.js
- Erreur `Cannot find module './276.js'` = cache `.next` corrompu → supprimer `.next` et relancer
- Sur Windows, tuer tous les process node avant de supprimer `.next`

## Chiffrement
- AES_SECRET doit faire exactement 32 caractères
- Format stockage : `iv:encrypted` (hex)
