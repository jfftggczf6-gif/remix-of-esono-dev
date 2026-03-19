

## Diagnostic

L'erreur "Load failed" est un timeout côté client : la fonction `reconstruct-from-traces` dépasse le temps CPU autorisé par l'infrastructure et est tuée en vol.

**Cause racine** : `verifyAndGetContext` dans `helpers.ts` traite les 9 fichiers uploadés **séquentiellement**. Pour chaque PDF ou image, il fait un appel Claude Sonnet (4096 tokens) pour l'extraction OCR. Avec 9 fichiers, cela fait potentiellement 9 appels Claude Sonnet + 1 appel final de reconstruction = le CPU time explose.

## Plan de correction

### 1. Utiliser un modele plus rapide pour l'extraction OCR (helpers.ts)

Remplacer `claude-sonnet-4-20250514` par `claude-haiku-3-20240307` pour les appels d'extraction de PDF et d'images. Haiku est 10x plus rapide et suffisant pour de l'OCR/extraction de texte.

- Ligne ~202 (PDF extraction) : changer le model
- Ligne ~260 (Image OCR) : changer le model
- Reduire max_tokens OCR de 4096 a 2048

### 2. Limiter le nombre de fichiers traites par vision (helpers.ts)

Ajouter un compteur pour les appels vision (PDF + images) et plafonner a 5 fichiers maximum. Les fichiers texte/CSV/Excel restent illimites car ils ne font pas d'appel API.

### 3. Ajouter un timeout client avec message clair (ReconstructionUploader.tsx)

Ajouter un `AbortController` avec timeout de 180 secondes sur le fetch de reconstruction, et afficher un message d'erreur explicite au lieu de "Load failed".

### Fichiers modifies

| Fichier | Modification |
|---------|-------------|
| `supabase/functions/_shared/helpers.ts` | Haiku pour OCR, max_tokens 2048, limite 5 fichiers vision |
| `src/components/dashboard/ReconstructionUploader.tsx` | Timeout 180s avec message explicite |

### Resultat attendu

- Temps de traitement divise par ~5 grace a Haiku
- Pas de crash CPU meme avec 9+ fichiers
- Message d'erreur clair si timeout

