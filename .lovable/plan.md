

# Plan : Agent IA Expert Analyste Financier + Fix CAGR/TRI

## Diagnostic du bug CAGR/TRI

Le probleme est dans `enforceFrameworkConstraints()` (normalizers.ts, lignes 504-516). Voici ce qui se passe :

1. L'IA genere `current_year` revenue = ex. 190M (valeur arbitraire)
2. `enforceFrameworkConstraints` ecrase year2-year6 avec les valeurs Framework (ex. year6 = 193M)
3. Mais `current_year` n'est PAS ecrase → reste a 190M
4. CAGR = (193/190)^(1/5) - 1 = **0.3%** au lieu de (193/89)^(1/5) - 1 = **16.7%**
5. Meme probleme pour TRI et CAGR EBITDA

La cause racine : `current_year` devrait venir des **donnees Inputs** (compte de resultat reel) et non de l'IA.

## Modifications

### 1. Fix `enforceFrameworkConstraints` — ancrer current_year sur les Inputs (normalizers.ts)

Ajouter un 3e parametre `inputsData` a `enforceFrameworkConstraints(data, frameworkData, inputsData)`. Avant les calculs de CAGR/TRI :

- Si `inputsData.compte_resultat.chiffre_affaires` existe → `data.revenue.current_year = inputsData.compte_resultat.chiffre_affaires`
- Si `inputsData.compte_resultat.resultat_net` existe → `data.net_profit.current_year = inputsData.compte_resultat.resultat_net`
- Idem pour EBITDA si disponible dans inputsData

Cela garantit que le **point de depart** des CAGR est le CA reel, pas celui hallucine par l'IA.

### 2. Mettre a jour les appels dans generate-plan-ovo (index.ts)

Passer les inputs data a enforceFrameworkConstraints :
```
data = enforceFrameworkConstraints(data, allData.framework, allData.inputs);
```

### 3. Renforcer les system prompts des 3 fonctions financieres

**generate-inputs** (SYSTEM_PROMPT) — Ajouter des instructions d'expertise :
- Normes SYSCOHADA revisee (2017) avec references precises
- Methodologie d'analyse financiere structuree (horizontal, vertical, ratios)
- Benchmarks sectoriels obligatoires avec sources
- Instructions de calcul precises pour chaque ratio

**generate-framework** (SYSTEM_PROMPT) — Enrichir avec :
- Methodologie de projection financiere (top-down + bottom-up)
- Formules explicites pour CAGR, TRI, VAN, DSCR
- Validation croisee obligatoire entre projections et historique
- Alertes automatiques si croissance > 30%/an ou marges hors benchmarks

**generate-plan-ovo** (buildSystemPrompt) — Renforcer :
- Formules de calcul explicites pour investment_metrics
- Contrainte : CAGR Revenue = (Revenue_Year6 / Revenue_CurrentYear)^(1/5) - 1
- Contrainte : current_year DOIT etre base sur les donnees Inputs reelles
- Validation : TRI doit etre > taux d'actualisation si VAN > 0

### 4. Ajouter une validation post-calcul dans enforceFrameworkConstraints

Apres les calculs de CAGR/TRI, ajouter des gardes :
- Si CAGR Revenue < 1% et revenue year6 > 2x current_year → recalculer
- Si TRI < 0 et VAN > 0 → forcer recalcul Newton-Raphson avec meilleure seed
- Si payback_years = 0 et funding_need > 0 → calculer correctement

## Fichiers impactes

| Fichier | Changement |
|---|---|
| `supabase/functions/_shared/normalizers.ts` | Fix enforceFrameworkConstraints : ancrer current_year sur Inputs + validation post-calcul |
| `supabase/functions/generate-plan-ovo/index.ts` | Passer inputsData a enforceFrameworkConstraints |
| `supabase/functions/generate-inputs/index.ts` | Enrichir SYSTEM_PROMPT expert financier |
| `supabase/functions/generate-framework/index.ts` | Enrichir SYSTEM_PROMPT expert financier |

