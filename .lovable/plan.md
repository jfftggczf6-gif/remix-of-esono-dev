

## Cache-bust : helpers.ts → helpers_v5.ts

### Problème
Le cache Deno ignore les commentaires de version. Le module `_shared/helpers.ts` compilé ne contient toujours pas `corsHeaders`. Seul un changement de **chemin** force une recompilation.

### Plan (5 étapes)

**Étape 1** — Créer `supabase/functions/_shared/helpers_v5.ts`
- Copie intégrale de `helpers.ts` (628 lignes)
- JSZip transformé en import dynamique (lazy) dans `parseDocx` et `parseXlsx`
- Suppression de `import JSZip from "https://esm.sh/jszip@3.10.1"` en top-level

**Étape 2** — Mettre à jour les imports dans **24 fichiers**

| # | Fichier | Import modifié |
|---|---------|---------------|
| 1 | `_shared/normalizers.ts` | `./helpers.ts` → `./helpers_v5.ts` |
| 2-24 | 23 edge functions `index.ts` | `../_shared/helpers.ts` → `../_shared/helpers_v5.ts` |

Les 23 edge functions (le user en listait 22, mais `generate-ovo-plan` importe aussi `getFiscalParamsForPrompt` depuis helpers) :

```text
reconstruct-from-traces     generate-pre-screening
generate-screening-report   generate-bmc
generate-sic                generate-diagnostic
generate-pitch-deck         generate-onepager
generate-valuation          generate-investment-memo
generate-business-plan      generate-framework
generate-plan-ovo           generate-inputs
generate-odd                generate-coach-report
generate-embeddings         parse-vision-file
access-data-room            extract-enterprise-info
extract-programme-criteria  ingest-knowledge
seed-knowledge-base         refresh-macro-data
generate-ovo-plan (AJOUTÉ — le user l'avait omis)
```

**Étape 3** — Supprimer `supabase/functions/_shared/helpers.ts`

**Étape 4** — Redéployer toutes les fonctions

**Étape 5** — Vérifier les logs de `reconstruct-from-traces` : le boot doit être OK

### Fichiers NON impactés
- `post-validator.ts` — n'importe pas depuis helpers
- `financial-knowledge.ts` — n'importe pas depuis helpers
- `generate-deliverables`, `download-deliverable`, `upload-template`, `reconcile-plan-ovo` — corsHeaders local
- `zip-utils.ts`, `ovo-data-expander.ts`, `framework-excel-template.ts`, `odd-excel-template.ts` — n'importent pas helpers

### Détail technique — lazy JSZip dans helpers_v5.ts

```typescript
// Ligne 3 supprimée : import JSZip from "https://esm.sh/jszip@3.10.1";

// Dans parseDocx (ligne ~25) :
export async function parseDocx(arrayBuffer: ArrayBuffer): Promise<string> {
  const JSZip = (await import("https://esm.sh/jszip@3.10.1")).default;
  // ... reste identique

// Dans parseXlsx (ligne ~70) :
export async function parseXlsx(arrayBuffer: ArrayBuffer): Promise<string> {
  const JSZip = (await import("https://esm.sh/jszip@3.10.1")).default;
  // ... reste identique
```

