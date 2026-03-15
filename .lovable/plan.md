

## Corriger la gestion multi-devises dans tous les modules de génération

### Problème

La table `FISCAL_PARAMS` dans `helpers.ts` contient bien la devise par pays (FCFA, CDF, GNF), mais :
- `generate-inputs` hardcode `"devise": "FCFA"` dans le prompt
- `generate-plan-ovo` hardcode `"currency": "XOF"` et `"exchange_rate_eur": 655.957`
- `generate-framework` hardcode `"devise": "FCFA"`
- `generate-ovo-plan` hardcode `"currency": "XOF"`, `exchange_rate_eur: 655.957`
- `getFiscalParamsForPrompt()` ne retourne ni la devise ni le taux de change

### Plan

#### 1. Enrichir `helpers.ts` — ajouter devise, code ISO et taux de change EUR

- Ajouter `currency_iso` et `exchange_rate_eur` dans `FISCAL_PARAMS` :
  - FCFA (XOF) : 655.957
  - FCFA (XAF) pour CEMAC (Cameroun, Gabon, Congo) : 655.957
  - CDF (RDC) : ~2800
  - GNF (Guinée) : ~9500
- Enrichir le type retourné par `getFiscalParamsForPrompt()` avec `devise`, `currency_iso`, `exchange_rate_eur`

#### 2. Modifier `generate-inputs/index.ts`

- Remplacer `"devise": "FCFA"` par `"devise": "${fp.devise}"` (dynamique depuis `getFiscalParams`)

#### 3. Modifier `generate-plan-ovo/index.ts`

- Dans `buildSystemPrompt` : remplacer `Devise: XOF (FCFA)` par `Devise: ${fp.currency_iso} (${fp.devise})`
- Dans `buildUserPrompt` JSON template : remplacer `"currency": "XOF"` et `"exchange_rate_eur": 655.957` par les valeurs dynamiques

#### 4. Modifier `generate-framework/index.ts`

- Remplacer `"devise": "FCFA"` hardcodé par la devise dynamique du pays

#### 5. Modifier `generate-ovo-plan/index.ts`

- Remplacer les hardcodes `XOF`, `FCFA`, `655.957` par les valeurs dynamiques depuis `getFiscalParamsForPrompt()`

#### 6. Fichiers inchangés

- `xlsx-generator.ts` et `download-deliverable/index.ts` utilisent déjà `data.devise || 'FCFA'` — ils hériteront automatiquement de la bonne devise puisque les données générées contiendront désormais la devise correcte

### Détails techniques — Mapping devises

```text
Pays              | devise | currency_iso | exchange_rate_eur
UEMOA (8 pays)    | FCFA   | XOF          | 655.957
CEMAC (3 pays)    | FCFA   | XAF          | 655.957
RDC               | CDF    | CDF          | 2 800 (approx)
Guinée            | GNF    | GNF          | 9 500 (approx)
```

