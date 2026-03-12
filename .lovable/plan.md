

## Diagnostic : Décalage entre Plan Financier Intermédiaire (Framework), Plan OVO JSON, et Excel OVO

### Problème identifié

Le screenshot montre un Excel OVO avec ~15.8M FCFA de CA en année courante, alors que le plan_ovo JSON a 54M et le Framework projette 62.1M en year2. Le décalage vient de l'architecture du pipeline Excel :

```text
Framework (source de vérité)
  ↓ enforceFrameworkConstraints
Plan OVO JSON (aligné ✅)
  ↓ ... mais Excel est généré séparément
generate-ovo-plan (appel Claude séparé)
  ↓ produits × volumes × prix
  ↓ scaleToFrameworkTargets (tente d'aligner)
Excel P&L (formules = SUM(produits)) ← DÉCALÉ ❌
```

L'Excel calcule son P&L via des formules qui additionnent les produits (volumes × prix) depuis RevenueData. Si les volumes/prix ne produisent pas le bon total, le P&L diverge. Le mécanisme de scaling tente de corriger, mais a 4 failles.

### 5 correctifs à appliquer

**1. Correction du nommage des champs volumes (`ovo-data-expander.ts`)**
`scaleCOGSToFramework` (ligne 95) utilise `volume_h1 + volume_h2` alors que `scaleToFrameworkTargets` utilise `volume_q1 || volume_h1`. Harmoniser vers un helper commun `getTotalVolume(yr)` pour éviter les calculs incohérents.

**2. Ajustement résiduel post-scaling (`ovo-data-expander.ts`)**
Après le scaling proportionnel de tous les produits, ajouter un ajustement résiduel : recalculer le revenu Excel total, comparer au target, et ajuster les volumes du plus gros produit pour combler l'écart exact. Cela garantit l'alignement à ±1 FCFA.

**3. Scaling des années historiques (`ovo-data-expander.ts`)**
`scaleToFrameworkTargets` ne scale actuellement que les années avec des targets (Framework = YEAR2-YEAR6, plan_ovo pour historical). Quand les données Inputs existent (CA = 54M), injecter le CA inputs comme target pour CURRENT YEAR et dériver YEAR-2/YEAR-1 par croissance inverse. Aujourd'hui les volumes historiques restent à 0 → revenus = 0 dans l'Excel.

**4. OPEX alignés sur plan_ovo (`generate-ovo-plan/index.ts`)**
Les OPEX écrits dans FinanceData viennent des sub-splits de l'IA (marketing.research, office.rent, etc.) qui sont déconnectés du plan_ovo. Quand les données plan_ovo.opex existent, utiliser celles-ci comme base pour distribuer les montants par sous-catégorie, au lieu de se fier uniquement à l'IA.

**5. Vérification post-construction des cellules (`generate-ovo-plan/index.ts`)**
Après `buildCellWrites`, ajouter une vérification finale : recalculer le revenu implicite depuis les cellules RevenueData (volumes × prix) pour chaque année. Logger un WARNING si écart > 5% avec le Framework. Si écart > 10%, déclencher un re-scaling correctif.

### Fichiers modifiés
- `supabase/functions/_shared/ovo-data-expander.ts` — fixes 1, 2, 3
- `supabase/functions/generate-ovo-plan/index.ts` — fixes 4, 5

