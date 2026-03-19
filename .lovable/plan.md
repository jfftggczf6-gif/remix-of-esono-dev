

# Fix: Screening Report invisible + Pre-screening shows raw JSON

## Two problems identified

### Problem 1 — Screening Report (82/100) not accessible
The `MODULE_CONFIG` bottom nav bar has no entry for `screening`. There's also no conditional button for it (unlike pre-screening which has one in the header). After generation, there's no way to navigate to it.

### Problem 2 — Pre-screening anomalies show raw JSON
The screenshot shows anomaly cards rendering the full JSON object as text (e.g., `{"severity":"attention","category":"documents","title":"Absence totale..."}`). This means the anomalies array contains **stringified JSON objects** instead of parsed objects. The viewer code does `a.title`, `a.detail` — but when `a` is a string, those are `undefined`, and React renders the whole string.

## Plan

### 1. Add Screening button in header bar (like Pre-screening)
**File**: `src/components/dashboard/EntrepreneurDashboard.tsx` (around line 1143-1154)

Add a conditional button for screening report, right next to the existing pre-screening button:
```typescript
{deliverables.some(d => d.type === 'screening_report') && (
  <Button
    variant={selectedModule === 'screening' ? 'default' : 'outline'}
    size="sm"
    className="gap-2 text-xs"
    onClick={() => setSelectedModule('screening')}
  >
    <Shield className="h-3.5 w-3.5" />
    Screening Report
  </Button>
)}
```

### 2. Auto-parse stringified anomalies in both viewers
**Files**: `src/components/dashboard/PreScreeningViewer.tsx` and `src/components/dashboard/ScreeningReportViewer.tsx`

Add a parsing helper at the top of each component to handle anomalies that arrive as JSON strings:

```typescript
// Parse anomalies — handle case where AI returns stringified JSON objects
const rawAnomalies = data.anomalies || [];
const anomalies = rawAnomalies.map((a: any) => {
  if (typeof a === 'string') {
    try { return JSON.parse(a); } catch { return { title: a, severity: 'note', detail: '' }; }
  }
  return a;
});
```

This ensures that even if the edge function saves anomalies as an array of JSON strings, the viewer will parse them correctly.

### 3. Add header title for screening module
**File**: `src/components/dashboard/EntrepreneurDashboard.tsx` (around line 1125-1131)

Add a header case for `screening` module (currently only `diagnostic` and `pre_screening` have custom headers):
```typescript
) : selectedModule === 'screening' ? (
  <>
    <Shield className="h-5 w-5 text-muted-foreground" />
    <h1 className="font-display font-semibold text-base">Screening Report</h1>
  </>
```

### Summary

| Issue | File | Fix |
|-------|------|-----|
| No nav button for screening | EntrepreneurDashboard.tsx | Add conditional button in header |
| No header title for screening | EntrepreneurDashboard.tsx | Add header case |
| Anomalies as raw JSON strings | PreScreeningViewer.tsx, ScreeningReportViewer.tsx | Auto-parse stringified anomalies |

