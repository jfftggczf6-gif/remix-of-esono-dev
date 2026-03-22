
# Corriger le vrai problème du dernier onglet "Décision"

## Constat
Le problème ne vient pas seulement du scroll : dans le code actuel, la Phase 4 est encore absente de la configuration.

- `src/lib/dashboard-config.ts` contient toujours :
  `// Phase 4 (Décision) masquée pour le pilote`
- Donc la sidebar ne peut pas afficher "Décision", même si la zone devient scrollable.
- En plus, il y a une incohérence de code entre `screening` et `screening_report` qu’il faut aligner pour que l’onglet ouvre bien le bon viewer.

## Ce que je vais faire

### 1. Réactiver la phase "Décision"
Dans `src/lib/dashboard-config.ts` :
- ajouter `phase_4`
- label : `Décision`
- module : `Décision programme`

### 2. Aligner les codes de module
Toujours dans la config et dans le dashboard :
- utiliser le même code partout pour ce module
- aujourd’hui :
  - la sidebar/mapping parle de `screening`
  - `MODULE_FN_MAP` contient `screening_report`
  - `EntrepreneurDashboard` affiche le viewer sur `selectedModule === 'screening'`
- je vais unifier ça pour éviter qu’un onglet apparaisse mais ne fonctionne pas correctement

### 3. Garder la sidebar scrollable
Le fix de scroll dans `DashboardSidebar.tsx` reste utile, donc je le conserve, mais il ne suffit pas à lui seul.

## Fichiers à modifier
- `src/lib/dashboard-config.ts`
- `src/components/dashboard/EntrepreneurDashboard.tsx`
- si nécessaire, petit ajustement complémentaire dans `src/components/dashboard/DashboardSidebar.tsx`

## Résultat attendu
- le dernier bloc `Décision` apparaît bien dans la sidebar
- on peut cliquer dessus
- il ouvre correctement la vue `Décision programme`
- la liste complète reste accessible même sur une hauteur d’écran réduite

## Détail technique
Le vrai bug visible dans le code actuel est structurel :
```text
PHASES n’inclut pas phase_4
=> aucun scroll ne peut faire apparaître un élément qui n’existe pas

et

screening !== screening_report
=> risque d’onglet visible mais non relié au bon contenu
```
