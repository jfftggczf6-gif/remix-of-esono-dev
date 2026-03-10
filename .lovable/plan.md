

# Audit du Rapport Coach — Problèmes identifiés

## Problème critique : `config.toml` manquant

Le fichier `supabase/config.toml` ne contient **aucune entrée** pour `generate-coach-report`. Sans `verify_jwt = false`, la fonction rejettera toutes les requêtes avec une erreur 401 (le système signing-keys ne fonctionne pas avec le JWT verification par défaut).

## Problème mineur : import inutilisé

`callAI` est importé dans `generate-coach-report/index.ts` (ligne 3) mais jamais utilisé — la fonction appelle l'API Anthropic directement. Cet import inutilisé peut provoquer une erreur de déploiement si `callAI` a des dépendances qui ne se résolvent pas.

## Ce qui fonctionne correctement

- **Frontend** (`CoachDashboard.tsx` lignes 677-718) : appel async correct, gestion du token, loader, téléchargement blob HTML — tout est bon.
- **Auth côté backend** : vérification du coach via `enterprises.coach_id` — correct.
- **Données** : récupération de tous les livrables + modules + profil coach — complet.
- **Prompt IA** : bien structuré, 12 sections, style CSS print-friendly — professionnel.
- **Nettoyage HTML** : suppression des wrappers markdown, vérification `<!DOCTYPE` — bon.

## Corrections à apporter

| Fichier | Correction |
|---|---|
| `supabase/config.toml` | Ajouter `[functions.generate-coach-report]` avec `verify_jwt = false` |
| `supabase/functions/generate-coach-report/index.ts` | Retirer l'import inutilisé `callAI` (ligne 3) |

