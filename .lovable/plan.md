

## Correction : restaurer les 3 exports manquants + version bump sur 24 fichiers

### Problème
`corsHeaders`, `jsonResponse`, `errorResponse` ont été supprimés de `helpers.ts`. Les 22 edge functions qui les importent crashent au boot (`worker boot error`).

### Plan

| # | Fichier | Action |
|---|---------|--------|
| 1 | `_shared/helpers.ts` | Ajouter `corsHeaders`, `jsonResponse`, `errorResponse` en ligne 4 (après imports, avant parseDocx). Mettre à jour le commentaire version en ligne 1 → `v4` |
| 2-23 | 22 fichiers `index.ts` | Ajouter `// v4 — restore corsHeaders 2026-03-19` en première ligne de chaque fichier qui importe depuis helpers.ts |

### Fichiers impactés (22 edge functions)

```text
reconstruct-from-traces    generate-pre-screening
generate-screening-report  generate-bmc
generate-sic               generate-diagnostic
generate-pitch-deck        generate-onepager
generate-valuation         generate-investment-memo
generate-business-plan     generate-framework
generate-plan-ovo          generate-inputs
generate-odd               generate-coach-report
generate-embeddings        parse-vision-file
access-data-room           extract-enterprise-info
extract-programme-criteria ingest-knowledge
seed-knowledge-base        refresh-macro-data
```

### Fichiers NON impactés (corsHeaders local, pas d'import helpers.ts)
- `generate-deliverables` — définit son propre corsHeaders
- `download-deliverable` — idem
- `upload-template` — idem
- `reconcile-plan-ovo` — idem
- `generate-ovo-plan` — idem

### Détail technique — helpers.ts

Ajouter après ligne 3 (`import JSZip...`) :

```typescript
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

export function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export function errorResponse(message: string, status = 500) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
```

### Détail technique — version bump (exemple)

Pour `generate-bmc/index.ts` actuellement :
```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
```
Devient :
```typescript
// v4 — restore corsHeaders 2026-03-19
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
```

Note : `generate-investment-memo` a déjà un commentaire `// v3` en ligne 1 — il passera à `// v4`.

