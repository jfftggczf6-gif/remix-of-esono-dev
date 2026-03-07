

# Plan : Deployer generate-plan-ovo et regenerer les donnees

## Diagnostic

Le probleme est confirme : **la fonction `generate-plan-ovo` n'a jamais ete redeployee** apres les corrections de code. Les logs montrent "No logs found" pour cette fonction, et les donnees en base sont toujours sur l'ancien schema :
- `base_year: 2023`, `current_year: 2024`, annees 2022-2029
- Aucune contrainte framework injectee (le bug `poste` vs `libelle` n'a jamais ete corrige en production)

Le code source est correct (annees dynamiques, extraction `poste || libelle`), mais il tourne encore en local — jamais deploye.

## Actions

### 1. Deployer la fonction `generate-plan-ovo`
Utiliser `supabase--deploy_edge_functions` pour deployer la version corrigee qui contient :
- Annees dynamiques (`new Date().getFullYear()` = 2026, donc 2024-2031)
- Extraction framework avec `l.poste || l.libelle`
- Contraintes numeriques injectees dans le prompt
- Normalizer `normalizePlanOvo` applique apres la generation

### 2. Verifier le deploiement
Tester la fonction deployee pour confirmer qu'elle repond sans erreur.

Apres deploiement, il suffira de regenerer le module Plan OVO depuis le dashboard pour obtenir des donnees avec les bonnes annees (2024-2031) et des revenus coherents avec le Plan Financier Intermediaire.

