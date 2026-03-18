

# Fix 3 Critical Bugs: Pre-screening, Screening & Investment Memo

## Bug 1 — `req.clone()` after body consumed (crashes screening & pre-screening)

In both `generate-screening-report/index.ts` (line 218-226) and `generate-pre-screening/index.ts` (line 203-211), `verifyAndGetContext(req)` is called first (which does `await req.json()` internally), then `req.clone().json()` is attempted to read `programme_criteria`. In Deno, a Request body can only be read once — the clone must happen BEFORE the first read.

**Fix**: In both files, move the `req.clone().json()` block BEFORE the `verifyAndGetContext(req)` call:

```typescript
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    // Clone BEFORE verifyAndGetContext consumes req.json()
    let programmeCriteria: any = null;
    try {
      const bodyClone = await req.clone().json().catch(() => ({}));
      programmeCriteria = bodyClone.programme_criteria || null;
    } catch (_) {}

    const ctx = await verifyAndGetContext(req);
    // ... rest unchanged, DELETE the old req.clone() block that was after verifyAndGetContext
```

**Files**: `supabase/functions/generate-screening-report/index.ts`, `supabase/functions/generate-pre-screening/index.ts`

## Bug 2 — Screening Report missing from automated pipeline

The `PIPELINE` array in `src/lib/dashboard-config.ts` has no entry for `generate-screening-report`. The screening report needs ALL deliverables as context, so it goes at the very end (after Investment Memo). Pre-screening stays out of the pipeline (it triggers post-reconstruction, which already works).

**Fix**: Add one entry at the end of `PIPELINE` and add `screening_report` to `MODULE_FN_MAP`:

```typescript
// After Investment Memo line:
{ name: 'Screening', fn: 'generate-screening-report', type: 'screening_report' as DeliverableType },
```

```typescript
// In MODULE_FN_MAP, add:
screening_report: 'generate-screening-report',
```

**File**: `src/lib/dashboard-config.ts`

## Bug 3 — Force redeploy of stale edge functions

The deployed edge functions still run a cached version of `_shared/helpers.ts` with the old `.catch()` pattern. Adding a version stamp to each function forces the runtime to re-import.

**Fix**: Add version comment + `console.log` at the top of each function (after imports):

```typescript
// v3 — force redeploy 2026-03-19
console.log("[function-name] v3 loaded");
```

**Files**: `supabase/functions/generate-screening-report/index.ts`, `supabase/functions/generate-pre-screening/index.ts`, `supabase/functions/generate-investment-memo/index.ts`

After code changes, explicitly deploy all 3 functions.

---

## Summary

| Bug | Files | Change |
|-----|-------|--------|
| req.clone() before body read | `generate-screening-report`, `generate-pre-screening` | Move clone block before `verifyAndGetContext` |
| Screening missing from pipeline | `dashboard-config.ts` | Add screening as last PIPELINE step + MODULE_FN_MAP |
| Stale deployment | 3 edge functions | Version bump + deploy |

