

## Diagnostic : "Load failed"

### Cause identifiee

Les logs montrent que l'orchestrateur `generate-deliverables` demarre les fonctions sequentiellement :
- BMC a 17:01:28 (~56s)
- SIC a 17:02:24 (~87s)  
- Inputs a 17:03:51
- Shutdown (timeout) a 17:04:47

**Total : ~3min20s.** Les fonctions backend ont un timeout de 150 secondes (2.5 min). L'orchestrateur depasse ce timeout, la connexion est coupee, et le client recoit "Load failed".

Chaque appel Anthropic prend 50-90 secondes. Avec 8 modules sequentiels, c'est impossible dans un seul appel backend.

### Solution : Appeler chaque fonction depuis le frontend

Au lieu d'appeler un seul orchestrateur qui fait tout, le frontend appellera chaque fonction une par une, avec un indicateur de progression en temps reel.

### Changements

**1. `EntrepreneurDashboard.tsx` et `CoachDashboard.tsx`** -- Refactorer la logique de generation :
- Remplacer l'appel unique a `generate-deliverables` par une boucle qui appelle chaque fonction individuellement (`generate-bmc`, `generate-sic`, `generate-inputs`, etc.)
- Avant chaque appel, verifier si le livrable existe deja (via les deliverables charges en memoire) pour le sauter
- Afficher la progression en temps reel : "Generation BMC (1/8)...", "Generation SIC (2/8)..."
- Gerer les erreurs par module (continuer meme si un module echoue, sauf erreur 402)
- Calculer le score global cote client

**2. Aucun changement backend** -- Les fonctions individuelles (`generate-bmc`, etc.) fonctionnent deja correctement. On arrete simplement d'utiliser l'orchestrateur.

### Details techniques

La boucle frontend :
```text
PIPELINE = [
  { name: "BMC",           fn: "generate-bmc",           type: "bmc_analysis" },
  { name: "SIC",           fn: "generate-sic",           type: "sic_analysis" },
  { name: "Inputs",        fn: "generate-inputs",        type: "inputs_data" },
  { name: "Framework",     fn: "generate-framework",     type: "framework_data" },
  { name: "Diagnostic",    fn: "generate-diagnostic",    type: "diagnostic_data" },
  { name: "Plan OVO",      fn: "generate-plan-ovo",      type: "plan_ovo" },
  { name: "Business Plan", fn: "generate-business-plan", type: "business_plan" },
  { name: "ODD",           fn: "generate-odd",           type: "odd_analysis" },
]

Pour chaque step:
  1. Afficher toast/progress "Generation {name} ({i}/{total})..."
  2. Verifier si deliverable existe deja (skip si oui)
  3. Appeler supabase.functions.invoke(step.fn, { body: { enterprise_id } })
  4. Gerer erreur (402 = stop, autre = noter et continuer)
  5. Mettre a jour le score
```

Chaque appel a son propre timeout de 150s, largement suffisant pour un seul module.

