

# Plan — Rendre la progression visible

## Problème
Le pipeline régénère bien les livrables avec les nouvelles données, mais :
- Le score global (`score_ir`) n'est jamais sauvegardé sur `enterprises`
- La version reste à 1 (pas de compteur)
- Aucun historique des scores pour visualiser l'évolution

## Corrections

### 1. Mettre à jour `score_ir` à la fin du pipeline
**Fichier** : `generate-deliverables/index.ts`

Après le calcul de `globalScore` (ligne 160), ajouter un `UPDATE` sur `enterprises` :
```sql
UPDATE enterprises SET score_ir = globalScore WHERE id = enterprise_id
```

### 2. Incrémenter la version dans `saveDeliverable`
**Fichier** : `helpers.ts` (fonction `saveDeliverable`)

Au lieu de `version: 1` en dur, d'abord lire la version actuelle du livrable existant, puis sauvegarder avec `version + 1`.

### 3. Créer une table `score_history`
**Migration SQL** :
```sql
CREATE TABLE score_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enterprise_id uuid NOT NULL,
  score integer NOT NULL,
  scores_detail jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE score_history ENABLE ROW LEVEL SECURITY;
-- Policy : même logique que deliverables (via enterprises ownership)
```

À la fin du pipeline, insérer une ligne avec le score global + le détail par module.

### 4. Afficher la progression sur le dashboard
**Fichier** : `EntrepreneurDashboard.tsx`

Ajouter un petit graphique (recharts, déjà installé) montrant l'évolution du score au fil des générations, basé sur `score_history`.

---

**Fichiers modifiés** : `helpers.ts`, `generate-deliverables/index.ts`, `EntrepreneurDashboard.tsx` + 1 migration SQL.

