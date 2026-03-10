

# Fix: Indicateurs d'investissement affichés en décimal au lieu de pourcentage

## Problème

Les métriques stockées en base sont en **format décimal** (ex: `tri: 0.1576`, `cagr_revenue: 0.3116`, `roi: 0.39`), mais le viewer les affiche directement avec `toFixed(1)` + `%`, ce qui donne **0.2%** au lieu de **15.8%**, **0.3%** au lieu de **31.2%**, etc.

Les seuils de statut (couleurs vert/orange/rouge) attendent déjà des valeurs en pourcentage (ex: `triStatus` compare `> 15`), confirmant que la conversion `×100` est manquante au moment du calcul des métriques.

## Correction : `src/components/dashboard/PlanOvoViewer.tsx`

Dans le `useMemo` (lignes 159-171), multiplier par 100 les valeurs décimales provenant de l'IA :

```typescript
return {
  van: ai?.van ?? calcNPV(...),
  tri: (ai?.tri ?? calcIRR(...)) * 100,           // 0.1576 → 15.76
  cagr_revenue: (ai?.cagr_revenue ?? calcCAGR(...)) * 100,  // 0.3116 → 31.16
  cagr_ebitda: (ai?.cagr_ebitda ?? calcCAGR(...)) * 100,    // idem
  roi: (ai?.roi ?? ...) * 100,                     // 0.39 → 39
  // payback, dscr, multiple_ebitda restent inchangés (pas des %)
  ...
};
```

Il faut aussi vérifier que les fonctions fallback `calcIRR` et `calcCAGR` retournent des décimales (pas déjà ×100) pour éviter un double ×100. Si elles retournent déjà des %, on ne multiplie que les valeurs `ai?.xxx`.

| Fichier | Changement |
|---|---|
| `src/components/dashboard/PlanOvoViewer.tsx` | Multiplier `tri`, `cagr_revenue`, `cagr_ebitda`, `roi` par 100 pour affichage en % |

