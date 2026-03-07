

## Correction du Plan Financier OVO : données incomplètes après 2027

### Diagnostic

En analysant les screenshots du fichier Excel généré, le problème est clair :
- **Revenus produits** : valeurs correctes pour 2024-2027, puis **zéros** pour 2028-2031
- **Prix et COGS unitaires** : correctement remplis pour les 8 années
- **Volumes (Q1/Q2)** : tombent à zéro après YEAR2 (2027) — c'est ça qui annule les revenus
- **OPEX** : correctement remplis sur 8 ans (l'expansion OPEX fonctionne)

**Cause racine** : Dans `expandProductOrService()` (ligne 880), si l'IA retourne un `per_year` avec >= 4 entrées (mais pas les 8), l'expansion est court-circuitée (`return p`). Quand le JSON AI est tronqué ou réparé, on se retrouve avec 4 années de données au lieu de 8. Les années manquantes n'ont pas de volumes → zéros dans Excel.

**Cause secondaire** : Le prompt AI ne fournit pas assez de données structurées des autres livrables (BMC flux_revenus avec prix détaillés, framework projections 5 ans ligne par ligne, inputs financiers avec ventilation CA).

### Plan d'implémentation

#### 1. Corriger l'expansion des produits/services (`generate-ovo-plan/index.ts`)

**`expandProductOrService()`** — refactorer la logique :
- Si `per_year` existe avec 4-7 entrées : extraire prix, COGS, volumes des entrées existantes, puis extrapoler les années manquantes avec le growth_rate
- Si `per_year` a 8 entrées mais que certaines années futures ont volume=0 alors que CY a volume>0 : remplir par extrapolation
- Supprimer le `return p` trop permissif quand `per_year.length >= 4`

**Ajouter `validateAndFillVolumes()`** — nouveau post-traitement après `expandCondensedData()` :
- Pour chaque produit/service actif : vérifier que toutes les 8 années ont des volumes > 0 (sauf YEAR-2/YEAR-1 si l'entreprise est nouvelle)
- Si des trous sont détectés : utiliser le dernier volume connu × (1 + growth_rate) pour remplir
- Logger un warning pour chaque produit corrigé

#### 2. Enrichir le contexte AI dans `buildUserPrompt()` (`generate-ovo-plan/index.ts`)

Extraire et injecter davantage de données des livrables existants :

- **BMC** : flux_revenus complet (prix_moyen, sources_revenus détaillées, modele_pricing, volume_estime par produit)
- **Inputs financiers** : compte de résultat détaillé (CA, achats matières, charges personnel, charges externes, dotations, résultat net), bilan actif/passif résumé
- **Framework** : projection_5ans — injecter TOUTES les lignes avec valeurs an1-an5, pas juste CA/EBITDA ; inclure ratios historiques pertinents et KPIs détaillés
- **Plan OVO JSON** (deliverable `plan_ovo`) : revenus et EBITDA par année — utiliser comme contraintes si non-stale

Ajouter une section dans le prompt :
```
CONTRAINTE CRITIQUE : CHAQUE produit actif DOIT avoir des volumes > 0 pour les 8 années (YEAR-2 à YEAR6).
Ne JAMAIS laisser les volumes à zéro après l'année courante.
Utilise le growth_rate pour projeter les volumes sur TOUTES les années futures.
```

#### 3. Validation post-expansion (`generate-ovo-plan/index.ts`)

Ajouter un appel à `validateAndFillVolumes()` après `expandCondensedData()` et `normalizeRangeData()` :
- Parcourir tous les produits/services actifs
- Pour chaque année YEAR3-YEAR6, si volume_h1 + volume_h2 = 0 :
  - Trouver la dernière année avec volume > 0
  - Appliquer growth_rate (ou 15% par défaut) pour extrapoler
  - Logger la correction

### Fichiers modifiés

- `supabase/functions/generate-ovo-plan/index.ts` — corrections expansion, enrichissement prompt, validation post-expansion

