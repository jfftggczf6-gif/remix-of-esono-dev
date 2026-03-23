

# Plan : Intégrer le champ `source` dans les schémas JSON des prompts

## Problème identifié

Les guardrails disent "ajoute un champ source à chaque élément" mais les schémas JSON dans les prompts des edge functions ne contiennent PAS ce champ. L'IA suit le schéma (qui est plus explicite) et ignore l'instruction générale des guardrails.

**La solution** : Ajouter `"source": "string"` directement dans les schémas JSON de chaque edge function, aux endroits où des constats chiffrés sont produits.

## Fichiers et modifications

### 1. `generate-pre-screening/index.ts` — Diagnostic Initial

Ajouter `"source"` dans :
- `constats_par_scope` — chaque constat (financier, commercial, operationnel, equipe_rh, legal_conformite)
- `guide_coach.points_bloquants_pipeline` — chaque blocage
- `sante_financiere.benchmark_comparison` — chaque indicateur

Schema avant :
```
"titre": "string", "severite": "urgent|attention|positif", "constat": "string", "piste": "string"
```
Schema après :
```
"titre": "string", "severite": "urgent|attention|positif", "constat": "string", "piste": "string", "source": "string"
```

### 2. `generate-diagnostic/index.ts` — Bilan de progression

Ajouter `"source"` dans :
- `problemes[]` — chaque problème
- `points_forts[]` — chaque point fort
- `benchmarks` — chaque indicateur benchmark

### 3. `generate-screening-report/index.ts` — Décision Programme

Ajouter `"source"` dans :
- `matching_criteres.criteres[]`
- `risques_programme[]`
- `conditions[]`

### 4. `generate-investment-memo/index.ts` — Memo Investisseur

Ajouter `"source"` dans :
- `analyse_risques.risques_identifies[]`
- `besoins_financement.utilisation_fonds[]`

### 5. `generate-onepager/index.ts` — One-Pager

Vérifier et ajouter `"source"` dans les items listés (traction, finances).

### 6. `generate-pitch-deck/index.ts` — Pitch Deck

Ajouter `"source"` dans `slides[].contenu.chiffres_cles[]`.

## Résumé

6 edge functions modifiées. Chaque schéma JSON inclura explicitement `"source": "string"` sur les objets contenant des constats chiffrés. Après redéploiement, toute nouvelle génération inclura les sources, et les viewers existants les afficheront automatiquement (le code d'affichage `{item.source && ...}` est déjà en place).

