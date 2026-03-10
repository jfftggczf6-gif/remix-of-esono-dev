

# Corriger le calcul du score global + relancer BP

## Problème
Le pipeline `generate-deliverables` ne calcule le score global qu'à partir des résultats retournés par les étapes exécutées. Quand des étapes sont skippées (livrables existants), leurs scores ne sont pas comptabilisés, ce qui donne un `score_ir = 0`.

## Corrections

### 1. Fix `generate-deliverables/index.ts`
Après la boucle du pipeline, si des étapes ont été skippées, récupérer les scores des livrables existants en base pour les inclure dans le calcul du score global.

```text
Pipeline loop terminée
  ↓
Charger les scores des livrables existants (SELECT type, score FROM deliverables WHERE enterprise_id = ?)
  ↓
Fusionner : scores des étapes exécutées + scores des livrables skippés
  ↓
Calculer global_score = moyenne de tous les scores
  ↓
UPDATE enterprises SET score_ir + INSERT score_history
```

Concrètement : après la boucle `for`, ajouter une query pour récupérer tous les scores existants et les utiliser dans le calcul global au lieu de se baser uniquement sur `results`.

### 2. Fix parsing BP (optionnel)
Le Business Plan a échoué car la réponse IA était tronquée. Ce n'est pas un bug de code — c'est un aléa IA. Une relance devrait fonctionner.

### 3. Mise à jour immédiate du score
Après le fix du code, on pourra aussi manuellement mettre à jour le `score_ir` d'ECOBRIC avec la moyenne des scores existants (≈83).

