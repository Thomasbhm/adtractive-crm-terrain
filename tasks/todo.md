# TODO — ADtractive CRM Terrain

## Version actuelle : v0.6.0 (work in progress — non déployée)

## Terminé ✅
- [x] v0.1 — Scan OCR, saisie manuelle, stockage MongoDB, auth JWT, admin
- [x] v0.2 — Intégration Axonaut (sync contacts, autocomplétion société, détection doublons, suppression cascade)
- [x] v0.3 — Notes vocales (enregistrement + transcription Mistral Voxtral)
- [x] v0.4 — Clé API par utilisateur + page /search Axonaut

## v0.5 — Fiche entreprise unifiée (en cours, non déployée, en attente retour client)
- [x] Page unifiée `/contacts/axonaut/company/[companyId]` avec 3 onglets Infos / Historique / Business
- [x] Fusion données locales (CRM terrain) + Axonaut sur même page via `?local` auto-résolu
- [x] Endpoint `/api/contacts/by-company/[companyId]` pour résoudre le contact local par axonaut_company_id
- [x] Endpoint `/api/axonaut/company-detail/[companyId]` agrégé (company + employees + events + quotations + invoices + opportunities)
- [x] Endpoints `/api/axonaut/events` et `/api/axonaut/tasks` pour ajout post-création
- [x] Gestion des 6 natures Axonaut (Email=2, Appel=3, Note=6, Réunion=1, Courrier=4, SMS=5)
- [x] Rendu HTML des emails via DOMPurify (sanitizer safelist)
- [x] Affichage des pièces jointes Axonaut (invoices/quotations/documents) sur events — note : PJ PDF bruts NON exposés par l'API v2 Axonaut
- [x] Écran "Accès restreint" clair quand Axonaut renvoie 404 (entreprise rattachée à un autre commercial)
- [x] Mode édition inline sur contact local (bouton Modifier top-right)
- [x] Bouton + Historique compact : 🎤 Vocale / ➕ Événement / ✅ Tâche (pill layout)
- [x] Chips filtre par type (Tout/Emails/Appels/Notes/Réunions/Autres) sur onglet Historique
- [x] Limite events 10 → 15
- [x] Ajout optimiste + reload en 2 passes (1.5s / 5s) pour compenser délai d'indexation Axonaut
- [x] Bouton refresh manuel
- [x] Note vocale one-click : transcription Mistral → push Axonaut (nature=6) sans étape intermédiaire
- [x] Page fallback `/contacts/local/[id]` pour contacts non-sync'd (avec CTA Synchroniser)
- [x] ContactCard route dynamiquement : sync'd → fiche entreprise ; non sync'd → fiche locale
- [x] Ancienne page `/contacts/[id]` supprimée (mode édition intégré à la fiche unifiée)
- [x] Dependance ajoutée : `isomorphic-dompurify`

## v0.6 — Refonte Pipedrive-like + planning centralisé (en cours, non déployée)
- [x] Design system : ajout palette Pipedrive-like (vert action #00B074, palette ink/line/surface) dans tailwind.config
- [x] Endpoint `/api/planning` : agrège toutes les tâches des contacts, groupées par période (en retard / aujourd'hui / demain / cette semaine / plus tard / sans date)
- [x] Nouvelle page `/planning` (page d'accueil par défaut au lieu de `/scan`)
- [x] Stats en haut : "à faire" + "réalisées" (compteurs corrects même quand done filtrées)
- [x] Cases à cocher interactives sur le planning (PATCH `/api/contacts/[id]/tasks/[taskId]`)
- [x] Toggle "Afficher aussi les tâches terminées"
- [x] Bouton "+ Tâche" (primaire bleu) en haut à droite du planning
- [x] Modale `NewTaskModal` en 2 étapes : recherche contact (local + Axonaut companies/employees) → formulaire tâche
- [x] Shell contact : endpoint `/api/contacts/from-axonaut` crée un contact local minimal à partir d'un Axonaut employee/company si l'utilisateur sélectionne un contact Axonaut-only
- [x] Bottom tab bar (5 tabs : Planning / Contacts / Scan [central proéminent vert] / Rechercher / Plus)
- [x] Drawer "Plus" (profil, planning, mot de passe, clé API, admin, logout)
- [x] Header top minimaliste (juste logo ADtractive)
- [x] Redirection de `/` et après login vers `/planning`
- [x] Choix heure pour tâche : optionnel (case à cocher) — obligatoire pour type='reunion'
- [x] Sync Axonaut intelligent : type='reunion' + heure → crée un **Event Axonaut nature=1** (Réunion) avec date+heure+durée 60min
- [x] Autres types avec heure → crée une Task Axonaut avec heure injectée dans le titre `[HH:MM] description`
- [x] Types sans heure → Task Axonaut standard (date seule)

## Reste à faire (refonte Pipedrive) — pas critique, pur visuel
- [ ] Fiche entreprise : tabs style iOS-pill (gris clair avec pill blanche active) au lieu de notre style actuel
- [ ] Action bar flottante sur fiche contact (📞 / ✉️ / ➕)
- [ ] Split onglet Chronologie en sections Priorité (à venir) vs Historique (passé)
- [ ] Liste `/contacts` et `/search` : style cartes Pipedrive + highlight du match
- [ ] Test régression complet après les changements visuels

## En attente retour client
- [ ] Retour client sur la vidéo de démo v0.6 (planning centralisé + flow nouvelle tâche)
- [ ] Ne rien déployer tant que validation client pas reçue

## Blockers v0.3 toujours en suspens (à vérifier une fois v0.5 validée)
- [ ] Transcription Mistral Voxtral — vérifier le nom de modèle exact (lessons.md indiquait modèle suspect)
- [ ] Notes → Axonaut events nature=6 : à confirmer en production (fonctionne en dev local)
- [ ] URL MinIO cassées sur certains contacts (image carte)

## Notes de session (avril 2026)
- Axonaut `/companies?search=X` renvoie des entreprises que l'API ne permet pas forcément de GET individuellement (rattachées à un autre commercial). Utiliser `searchCompany` uniquement pour l'autocomplétion, pas pour déduire que la fiche est accessible.
- Event `nature` retourné par GET est un string ("Email", "Note", "Phone"…) alors qu'en POST on envoie un int. `normalizeNature()` gère les deux formats.
- Attachments d'un event Axonaut : `{invoices, quotations, documents}` — ne contient QUE les entités Axonaut rattachées, PAS les PJ de fichiers (PDF bruts d'un mail par exemple). Limite API.
- Indexation Axonaut post-POST : délai variable (1-5s). D'où le pattern optimiste + retry.
