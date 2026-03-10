

# Rapport Coach Complet — Edge Function avec Claude Sonnet

## Résumé

Créer une Edge Function `generate-coach-report` qui utilise Claude Sonnet (via l'API Anthropic existante, clé `ANTHROPIC_API_KEY` déjà configurée) pour générer un rapport narratif professionnel et détaillé par entrepreneur. Le rapport sera un HTML riche téléchargeable.

## Architecture

```text
Coach clique "Rapport Détaillé"
  → appel Edge Function generate-coach-report (via callAI / Anthropic)
    → récupère tous les livrables de l'entrepreneur
    → construit un prompt avec les données résumées
    → Claude Sonnet rédige le rapport narratif
    → assemble HTML professionnel print-friendly
  ← retourne le HTML
  → téléchargement automatique
```

## Sections du rapport généré par l'IA

1. **Page de garde** — Nom, secteur, pays, date, score IR
2. **Résumé exécutif** — Synthèse narrative (forces, faiblesses, potentiel)
3. **Modèle économique (BMC)** — Analyse rédigée du canvas
4. **Impact social (SIC)** — Mission, théorie du changement, ODD
5. **Analyse financière** — Compte de résultat, bilan, ratios, santé
6. **Projections financières** — Revenue 5 ans, scénarios, TRI/VAN/ROI
7. **Business Plan** — Résumé exécutif, marché, stratégie
8. **Diagnostic global** — Forces/faiblesses/opportunités
9. **Recommandations stratégiques** — Plan d'action priorisé
10. **Annexe** — Scores détaillés par module

## Implémentation

### 1. Nouvelle Edge Function `supabase/functions/generate-coach-report/index.ts`

- Vérifie que l'utilisateur est coach de l'entreprise (via `has_role` + `enterprises.coach_id`)
- Récupère l'entreprise et tous ses livrables depuis la table `deliverables`
- Utilise `callAI()` depuis `_shared/helpers.ts` (Claude Sonnet 4, déjà configuré avec `ANTHROPIC_API_KEY`)
- System prompt demandant un rapport HTML structuré, professionnel, rédigé en français
- `max_tokens: 16384` pour un rapport complet
- Retourne le HTML directement (Content-Type: text/html)

### 2. Modification `src/components/dashboard/CoachDashboard.tsx`

- Remplacer `handleDownloadReport` (actuellement HTML statique, lignes 676-754) par un appel async à la nouvelle Edge Function
- Ajouter un état `generatingReport` pour afficher un loader pendant la génération
- Le bouton existant devient "Rapport Détaillé IA" avec un Sparkles icon
- Gestion d'erreur avec toast

### 3. Pas besoin de modifier `config.toml` — il sera mis à jour automatiquement

## Fichiers impactés

| Fichier | Action |
|---|---|
| `supabase/functions/generate-coach-report/index.ts` | Créer — Edge Function complète utilisant `callAI` (Claude Sonnet) |
| `src/components/dashboard/CoachDashboard.tsx` | Modifier — `handleDownloadReport` → appel async avec loader |

