

## Plan: Auto-extraction du nom, pays et secteur depuis les documents uploadés

### 1. Nouvelle edge function `supabase/functions/extract-enterprise-info/index.ts`

- Utilise le même pattern d'auth que les autres fonctions (via `verifyAndGetContext` adapté ou inline)
- Lit les documents uploadés depuis le bucket `documents/{enterprise_id}`
- Parse DOCX/XLSX/TXT via les helpers existants (`parseDocx`, `parseXlsx`)
- Appelle Lovable AI (`google/gemini-3-flash-preview`) avec un prompt court : "Extrais le nom exact, le pays et le secteur d'activité de l'entreprise depuis ces documents. Retourne JSON: {name, country, sector}"
- Utilise `LOVABLE_API_KEY` (déjà configuré) au lieu d'Anthropic pour cette tâche légère
- Retourne `{ name, country, sector }` sans modifier la base

### 2. Config TOML

Ajouter `[functions.extract-enterprise-info]` avec `verify_jwt = false` dans `supabase/config.toml`.

### 3. Mise à jour de `EntrepreneurDashboard.tsx`

- Après `handleFileUpload` réussit, appeler `extract-enterprise-info` en arrière-plan
- Si les infos extraites diffèrent du profil actuel, afficher un **Dialog de confirmation** :
  > "D'après vos documents, votre entreprise semble être **MORINGA GOLD TOGO** (Togo, Agroalimentaire). Mettre à jour ?"
- Boutons : "Oui, mettre à jour" → update `enterprises` table / "Non merci" → fermer
- Nouveaux états : `extractedInfo`, `showExtractDialog`

### Fichiers modifiés
- `supabase/functions/extract-enterprise-info/index.ts` — nouvelle fonction
- `supabase/config.toml` — ajout entrée
- `src/components/dashboard/EntrepreneurDashboard.tsx` — appel post-upload + dialog confirmation

