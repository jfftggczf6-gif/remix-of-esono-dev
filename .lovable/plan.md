

## Recommandation : Ne pas créer la table `livrables`

La table `deliverables` existante couvre déjà tout ce dont vous avez besoin :

| Besoin `livrables` | Équivalent `deliverables` |
|---|---|
| `user_id` | `enterprise_id` (lié au user via `enterprises.user_id`) |
| `type` | `type` (enum: bmc_analysis, plan_ovo, etc.) |
| `file_name` | Déductible du type + nom entreprise |
| `download_url` | `file_url` |
| `data` | ✅ `data` (jsonb) — stocke tout le contenu |
| RLS | ✅ Déjà en place via enterprise ownership |

Créer `livrables` en parallèle causerait une duplication de données et de la confusion.

## Plan d'action

### 1. Créer les 2 Storage Buckets privés
Migration SQL :
```sql
INSERT INTO storage.buckets (id, name, public) VALUES ('ovo-templates', 'ovo-templates', false);
INSERT INTO storage.buckets (id, name, public) VALUES ('ovo-outputs', 'ovo-outputs', false);
```
Pas de policies RLS = accès `service_role` uniquement.

### 2. Ne PAS créer la table `livrables`
Utiliser `deliverables` existante. La fonction `generate-plan-ovo` y écrit déjà les résultats via `saveDeliverable()`.

### 3. Aucune modification de code nécessaire
Le pipeline existant (`generate-plan-ovo`, `download-deliverable`, `Livrables.tsx`) fonctionne déjà avec la table `deliverables`.

