# Leçons apprises

## Déploiement
- **JAMAIS push/deploy sur GitHub sans permission explicite de l'utilisateur**

## API Axonaut
- Header auth : `userApiKey` uniquement (pas Bearer, pas Authorization)
- Dates Events/Companies : RFC3339 sans millisecondes (`2026-03-22T14:30:00+01:00`)
- Dates Tasks : `DD/MM/YYYY` (format différent des autres)
- Dates Invoice/Contract/Opportunity en réponse GET : **timestamps Unix en string** (ex: `"1653955200"`)
- POST /employees requiert `company_id` obligatoirement
- Employees = contacts clients / Workforces = employés internes
- Pagination : header `page` (integer), pas un query param
- Event `nature` : envoyé en POST comme int (1=Réunion, 2=Email, 3=Appel, 4=Courrier, 5=SMS, 6=Note), mais retourné en string (ex: "Email", "Phone", "Note", "meeting"). Toujours `.toLowerCase()` avant comparaison.
- Event `attachments` ne contient QUE les entités Axonaut rattachées (`{invoices, quotations, documents}`), **PAS les PJ de fichiers bruts** (PDF d'un mail). L'API v2 n'expose pas ces PJ.
- `/companies?search=X` peut renvoyer des companies que l'utilisateur ne peut PAS GET individuellement (404 sur GET /companies/{id}) car elles sont rattachées à un autre commercial. N'utiliser search que pour autocomplétion/découverte, pas pour déduire l'accessibilité détail.
- Axonaut met **1-5s à indexer** un event nouvellement créé avant qu'il n'apparaisse sur GET /companies/{id}/events. Prévoir pattern optimiste + retry.
- Erreur API : `{error: {message: "...", status_code: "404"}}` (structure imbriquée) — bien extraire `.error.message` sinon on affiche `[object Object]`.

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
