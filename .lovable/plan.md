

## Diagnostic : Divergence entre Plan OVO Viewer, Framework et Excel OVO

### Cause racine

Il y a **3 pipelines indépendants** qui produisent chacun leurs propres chiffres :

1. **Framework** (`generate-framework`) → stocké dans `deliverables.type = "framework_data"` → affiché dans `FrameworkViewer` → source de vérité pour les projections An1-An5 (CA, Marge Brute, EBITDA, Résultat Net)

2. **Plan OVO JSON** (`generate-plan-ovo`) → appel IA séparé → normalisé par `normalizePlanOvo` → puis contraint par `enforceFrameworkConstraints` → stocké dans `deliverables.type = "plan_ovo"` → affiché dans `PlanOvoViewer`

3. **Excel OVO** (`generate-ovo-plan`) → appel IA **complètement séparé** (prompt différent, format condensé produit/volume/prix) → aligné par `scaleToFrameworkTargets` + `scaleCOGSToFramework` + `alignStaffToTarget` + `alignOpexToPlanOvo` → injecté cellule par cellule dans le `.xlsm`

Le problème est que le pipeline **Excel OVO** fait son propre appel IA, puis aligne les revenues (volumes × prix) sur les cibles Framework. Mais les COGS, OPEX, Staff et autres postes passent par des fonctions d'alignement différentes de celles de `enforceFrameworkConstraints`. Résultat : les agrégats dans le `.xlsm` divergent des chiffres du Plan OVO Viewer et du Framework.

### Divergences concrètes identifiées

| Poste | Plan OVO Viewer | Excel OVO | Cause |
|-------|----------------|-----------|-------|
| Revenue | ✅ Aligné Framework | ✅ Aligné (scaleToFrameworkTargets) | OK |
| COGS | Framework: `revenue - marge_brute` | `scaleCOGSToFramework` (ratio par produit) | Arrondi + agrégation multi-produits = écart |
| Staff | Ajusté via `enforceFrameworkConstraints` (ratio OPEX) | Ajusté via `alignStaffToTarget` (ratio ~0.45) | Fonctions différentes |
| OPEX | Proportionnel `gross_profit - ebitda` | `alignOpexToPlanOvo` puis `alignTotalOpexToFramework` | Double ajustement crée des écarts |
| EBITDA | Exact Framework | Calculé par formules Excel (MB - OPEX) | Pas directement écrit, dépend des postes |

### Solution proposée

**Modifier `generate-ovo-plan/index.ts`** pour qu'il utilise les données du **Plan OVO JSON réconcilié** (`plan_ovo` deliverable) comme source de vérité pour les agrégats, au lieu de laisser les fonctions d'alignement produire leurs propres valeurs indépendamment.

Concrètement :

1. **Après tous les alignements produit/COGS/OPEX/Staff**, ajouter une étape de **vérification finale** qui compare les totaux calculés (somme des produits × prix, somme OPEX, etc.) aux valeurs du `plan_ovo` deliverable réconcilié.

2. **Si écart > 1% sur un agrégat** (Revenue, COGS, OPEX total, Staff total), appliquer un **facteur correctif proportionnel** sur les lignes détaillées pour que le total de l'Excel corresponde exactement au Plan OVO Viewer.

3. **Ajouter des logs de vérification** comparant chaque agrégat Excel vs Plan OVO vs Framework pour tracer les écarts.

### Fichiers modifiés

- `supabase/functions/generate-ovo-plan/index.ts` — Ajouter l'étape de réconciliation finale post-alignement
- `supabase/functions/_shared/ovo-data-expander.ts` — Ajouter une fonction `reconcileWithPlanOvo()` qui ajuste les détails pour matcher les totaux du Plan OVO JSON

### Résultat attendu

Après modification, les 3 vues (Framework, Plan OVO Viewer, Excel OVO) afficheront les mêmes chiffres pour Revenue, COGS, Marge Brute, OPEX, EBITDA, Résultat Net et Cash-Flow.

