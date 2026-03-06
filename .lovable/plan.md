
Objectif: corriger le fait que la régénération OVO renvoie “Load failed” puis laisse l’utilisateur avec l’ancien fichier (donc impression de “même fichier”).

1) Diagnostic confirmé (à partir des logs/code)
- La génération backend termine bien (`[generate-ovo-plan] SUCCESS`) et un nouveau fichier est bien créé dans le stockage.
- Mais la réponse HTTP se ferme côté client (`Http: connection closed before message completed` + `Error: Load failed`).
- Comme la mise à jour du lien est faite uniquement côté frontend après `response.json()`, quand la connexion casse, la ligne `deliverables.plan_ovo_excel` reste avec l’ancienne URL (21:23), donc le bouton télécharge l’ancien fichier.
- Le nom local téléchargé est statique (`..._PlanFinancierOVO.xlsm`), ce qui masque encore plus la différence de version.

2) Correctif principal (fiabiliser même si la réponse réseau casse)
Fichiers:
- `supabase/functions/generate-ovo-plan/index.ts`
- `src/components/dashboard/EntrepreneurDashboard.tsx`

Backend `generate-ovo-plan`:
- Exiger `enterprise_id` dans le payload (et valider que l’utilisateur y a accès).
- Au démarrage: upsert `deliverables` type `plan_ovo_excel` avec `data.status = "processing"`, `request_id`, `started_at`.
- Après upload réussi: mettre à jour la même ligne avec `data.status = "completed"`, `file_name`, `storage_path`, `generated_at`, et `file_url` (signed URL).
- En cas d’erreur: `data.status = "failed"` + `error`.
- Résultat: même si la réponse HTTP côté client est coupée, l’état réel est sauvegardé en base.

Frontend `EntrepreneurDashboard`:
- Envoyer `enterprise_id` + `request_id` lors du POST.
- Si `Load failed`/erreur réseau: lancer un polling (2–3s) sur `deliverables(plan_ovo_excel)` filtré par `request_id` (ou `updated_at > start` fallback) jusqu’à `completed/failed`.
- Si `completed`, afficher automatiquement le nouveau lien et toast “Fichier prêt”.
- Utiliser `file_name` réel pour le nom du fichier téléchargé (au lieu d’un nom statique).

3) Éviter les faux “même fichier” (cache/version)
Dans `generate-ovo-plan`:
- Nom de sortie vraiment unique (timestamp complet + suffixe aléatoire), pas une granularité minute.
- Upload avec `upsert: false` + `cacheControl: "no-store"` pour éviter de retomber sur une version cachée.
- (Optionnel) réduire les logs “Skipping formula cell ...” en log agrégé pour limiter le bruit.

4) Détails techniques (implémentation concise)
```text
Frontend click "Regénérer"
  -> POST /generate-ovo-plan { enterprise_id, request_id, ... }
  -> si 200: utiliser response
  -> si erreur réseau: polling deliverables[type=plan_ovo_excel]
      status=processing -> continuer
      status=completed -> récupérer file_url + activer téléchargement
      status=failed -> afficher erreur
```
- Aucun nouveau tableau requis: on réutilise `deliverables.data` pour `status/request_id/error`.
- RLS existante sur `deliverables` est déjà compatible pour lecture utilisateur.

5) Validation fin de fix
- Lancer 2 régénérations successives rapides et vérifier:
  - fichier en stockage avec noms différents,
  - `deliverables.plan_ovo_excel` mis à jour même si la requête initiale échoue,
  - bouton télécharge bien la dernière version,
  - nom local du fichier reflète la version.
- Vérification end-to-end UI: génération, état “en cours”, état “terminé”, téléchargement.
