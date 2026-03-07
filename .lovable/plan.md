

# Plan: Simplifier drastiquement le prompt Claude pour le Plan OVO

## Problème racine
Claude génère ~3000+ tokens de JSON avec 19 champs × 8 années × N produits/services. 90% sont des zéros ou des valeurs calculables (mix_r2=0, mix_r3=0, cogs_r2=0, volume_q3=0, etc.). Cela dépasse systématiquement le timeout Deno (~400s).

## Solution
Claude génère uniquement les **valeurs métier** (~8 champs par produit). Le code TypeScript **expand** ces valeurs condensées en le format per_year complet que `buildCellWrites` attend déjà.

## Fichier modifié
`supabase/functions/generate-ovo-plan/index.ts`

## Changements détaillés

### 1. Nouveau JSON Schema demandé à Claude (dans `buildUserPrompt`)

Remplacer le schema actuel (lignes 740-837) par un schema condensé :

```text
Produit condensé (~10 champs au lieu de 171):
{
  "slot": 1, "name": "...", "active": true, "description": "...",
  "range_flags": [1,0,0], "channel_flags": [0,1],
  "price_cy": 12000,       // prix unitaire Current Year
  "cogs_rate": 0.35,       // COGS = rate × prix
  "volume_ym2": 1500,      // volume YEAR-2 (0 si startup)
  "volume_ym1": 3000,      // volume YEAR-1
  "volume_cy": 5000,       // volume Current Year total
  "growth_rate": 0.20,     // croissance annuelle volumes
  "price_growth": 0.03     // croissance prix (~inflation)
}

Staff condensé:
{
  "category_id": "STAFF_CAT01",
  "occupational_category": "EMPLOYE(E)S",
  "department": "DIRECTION", 
  "social_security_rate": 0.1645,
  "headcount_by_year": [0, 1, 2, 2, 3, 3, 4, 4],  // 8 valeurs (YM2→Y6)
  "monthly_salary_cy": 400000,
  "salary_growth": 0.05,
  "annual_allowances_cy": 50000
}

OPEX condensé (totaux par catégorie + croissance):
{
  "marketing": { "total_cy": 1500000, "growth": 0.10, "split": {"advertising": 0.6, "receptions": 0.2, "research": 0.1, "documentation": 0.1} },
  "office": { "total_cy": 800000, "growth": 0.05, "split": {"rent": 0.4, "internet": 0.15, ...} },
  ...
}
```

### 2. Nouvelle fonction `expandProducts` (ajouter entre `callClaudeAPI` et `buildCellWrites`)

Prend le JSON condensé de Claude et reconstruit le format `per_year` complet :
- Calcule prix/COGS pour chaque année via `price_growth`
- Calcule volumes via `growth_rate` et split H1=45%/H2=55%
- Met mix_r1=1.0, mix_r2=0, mix_r3=0 (puisque range_flags=[1,0,0])
- Met volume_q3=0, volume_q4=0 (non utilisés)

### 3. Nouvelle fonction `expandStaff`

Convertit `headcount_by_year` + `monthly_salary_cy` + `salary_growth` en le format `per_year` avec `headcount`, `gross_monthly_salary_per_person`, `annual_allowances_per_person` pour chaque année.

### 4. Nouvelle fonction `expandOpex`

Convertit les totaux OPEX condensés en arrays de 10 valeurs (O→X) par sous-catégorie, en appliquant le split et la croissance.

### 5. Intégration dans le handler principal (ligne ~174)

Après `callClaudeAPI`, avant `buildCellWrites` :
```
financialJson.products = expandProducts(financialJson.products);
financialJson.services = expandProducts(financialJson.services);
financialJson.staff = expandStaff(financialJson.staff);
financialJson.opex = expandOpex(financialJson.opex);
```

Le reste du pipeline (normalizeRangeData, buildCellWrites, injectIntoXlsm) reste **inchangé**.

### 6. Réduire `max_tokens` à 8192

Le JSON condensé fait ~600 tokens au lieu de 3000+. On peut réduire `max_tokens` de 24576 à 8192, ce qui accélère aussi Claude.

### 7. Retirer le schema JSON verbeux du prompt

Le schema exemple actuel (lignes 740-837) fait ~100 lignes de zéros. Le remplacer par le schema condensé (~30 lignes).

## Impact estimé
- **Tokens output Claude** : ~3000 → ~600 (÷5)
- **Temps génération** : ~100-180s → ~20-40s
- **Timeout risk** : éliminé
- **Aucun changement frontend** nécessaire
- **`buildCellWrites` inchangé** — les fonctions expand produisent exactement le même format

## Risques
- Si Claude ne suit pas le schema condensé : les normalizers existants + validation post-IA attrapent ça
- Les valeurs calculées (H1/H2 split, price growth) sont des approximations raisonnables — le template Excel recalcule les totaux via ses formules VBA

