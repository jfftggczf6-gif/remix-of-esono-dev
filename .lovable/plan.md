

## Plan : Refonte complète du Module Plan Financier OVO

### Contexte

Le module actuel `generate-plan-ovo` produit un JSON simplifié (3 scenarios OVO) et n'a pas de remplissage Excel template. Le nouveau module doit :
1. Utiliser le template .xlsm fourni (avec macros VBA) stocke dans Storage
2. Appeler Claude avec un prompt detaille pour generer des projections 5 ans structurees
3. Remplir la feuille InputsData du template via JSZip (seule approche viable dans Deno edge functions -- exceljs ne fonctionne pas dans Deno)
4. Generer un rapport HTML visuel avec Chart.js

### Contrainte technique importante

**exceljs ne fonctionne pas dans Deno edge functions.** On utilisera JSZip (deja en place dans le projet) pour manipuler le XML du .xlsm directement. JSZip preserve automatiquement tous les fichiers du ZIP, y compris `xl/vbaProject.bin` (les macros VBA). C'est la meme approche qui fonctionne deja pour le framework Excel.

---

### Changements

**1. Upload du template dans Storage**
- Copier `251022-PlanFinancierOVO-Template5Ans-v0210-EMPTY.xlsm` vers le bucket `templates` dans Supabase Storage

**2. Nouveau fichier : `supabase/functions/_shared/plan-ovo-excel-template.ts`**
- Fonction `fillPlanOvoExcelTemplate(data, enterpriseName, supabase)` qui :
  - Telecharge le template .xlsm depuis Storage
  - Ouvre avec JSZip
  - Localise la feuille InputsData (probablement `xl/worksheets/sheet3.xml` base sur l'ordre ReadMe > Instructions > InputsData)
  - Ecrit les valeurs dans les cellules mappees via `setCellInXml()` (meme helper que framework-excel-template.ts) :
    - J5: Company name, J6: Country, J8: "XOF", J9: 655.957
    - J12: 0.18 (TVA), J14: 0.03 (inflation)
    - J17: 0.04 (Tax Regime 1), J18: 0.25 (Tax Regime 2)
    - J24: Base year (Year-2)
    - H36-H55 + I36-I55: Product names + filter (1/0)
    - H58-H67 + I58-I67: Service names + filter (1/0)
    - J70-J72: Range descriptions, J75-J76: Distribution channels
    - H113-H122 + I113-I122 + J113-J122: Staff categories
    - Rows 125-127: Loan terms (OVO, Family, Bank)
    - Rows 130+: Simulation parameters
  - Egalement tente de remplir la feuille ReadMe (L3 = "French")
  - Retourne le buffer .xlsm (Uint8Array)

**3. Recrire `supabase/functions/generate-plan-ovo/index.ts`**
- **Step 1** : Utiliser `verifyAndGetContext()` existant pour recuperer l'entreprise + modules precedents (BMC, SIC, inputs)
- **Step 2** : Appeler Claude (claude-sonnet-4-20250514 via ANTHROPIC_API_KEY) avec le nouveau prompt structure qui demande le JSON detaille (company, products, services, revenue par annee, opex detaille, staff, capex, loans, etc.)
- **Step 3** : Appeler `fillPlanOvoExcelTemplate()` pour generer le .xlsm rempli, encoder en base64, sauvegarder dans deliverables (type `plan_ovo_excel`, champ `html_content` pour le base64 -- meme pattern que framework_excel)
- **Step 4** : Generer le HTML visuel avec Chart.js CDN :
  - Header: company, country, currency, date
  - Tableau sommaire 8 colonnes (Year-2 a Year6) x 6 lignes (Revenue, COGS, Gross Profit, Gross Margin %, EBITDA, Net Profit)
  - Bar chart Revenue vs EBITDA
  - Line chart Net Profit + Cashflow
  - Tableaux Staff et CAPEX
  - Section Key Assumptions
  - Break-even year mis en evidence
  - Theme sombre (#0f172a, #1e293b, accent #22d3ee)
- Sauvegarder JSON + HTML dans deliverables (type `plan_ovo`)

**4. Modifier `supabase/functions/download-deliverable/index.ts`**
- Ajouter un bloc pour `plan_ovo` au format `xlsx` :
  - Chercher d'abord le deliverable `plan_ovo_excel` pregenere (base64 dans `html_content`)
  - Si trouve, decoder et servir en `application/vnd.ms-excel.sheet.macroEnabled.12` avec extension `.xlsm`
  - Sinon, fallback sur la generation a la volee via `fillPlanOvoExcelTemplate()`
  - Content-Type: `application/vnd.ms-excel.sheet.macroEnabled.12`

**5. Modifier `src/pages/Livrables.tsx`**
- Ajouter un bouton de telechargement `.xlsm` pour le type `plan_ovo` (comme le `.xlsx` existe deja pour framework_data)
- Ajuster le format d'extension affiche

**6. Mettre a jour `supabase/config.toml`**
- Aucun changement necessaire (generate-plan-ovo est deja configure)

### Dependances partagees

La fonction `setCellInXml()` de `framework-excel-template.ts` sera extraite ou dupliquee dans le nouveau fichier `plan-ovo-excel-template.ts` pour eviter les imports circulaires.

### Flux de donnees

```text
Entrepreneur Data (BMC + SIC + Inputs)
        │
        ▼
   Claude API (prompt detaille)
        │
        ▼
   JSON structure (revenue, opex, staff, capex, loans...)
        │
        ├──► fillPlanOvoExcelTemplate() ──► .xlsm (base64 → DB)
        │
        └──► generatePlanOvoHTML() ──► HTML avec Chart.js (→ DB)
```

### Risques et mitigations

- **Mapping cellules incorrect** : Le parsing du template montre que la colonne VALUE pourrait etre I au lieu de J. On implementera une detection dynamique (chercher la colonne contenant "VALUE" dans le header de InputsData) comme fallback.
- **Timeout** : Un seul appel Claude (~60-90s) + remplissage Excel (~2s) + generation HTML (~1s) = ~95s max, bien dans la limite de 150s.

