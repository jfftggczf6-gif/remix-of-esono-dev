

## Parité Vue Miroir ↔ Vue Entrepreneur

### Diagnostic des écarts

Après analyse ligne par ligne des deux vues, voici les différences majeures :

| Feature | Entrepreneur | Vue Miroir Coach |
|---------|-------------|-----------------|
| Layout global | App-shell (`h-screen flex flex-col`) avec sidebar fixe `w-72` | Card dans `grid-cols-4` — pas d'app-shell |
| Barre IR Score | Bandeau sombre avec score, maturité, graphe historique | Absent |
| Barre titre module | `h-12` avec icône + nom du module sélectionné | Absent |
| Bouton "Générer" flottant | `fixed bottom-20 left-2` avec état smart (generate/update/up_to_date) + "Régénération complète" | Bouton dans la sidebar card uniquement |
| Bannière de progression | `fixed top-0` non-bloquante pendant la génération | Overlay bloquant plein écran |
| Animation pipeline dans barre de modules | Spinner sur le module actif, checkmark pour les terminés, opacité pour ceux en attente | Simple état selected/completed |
| Génération OVO Excel standalone | Bouton dans la barre plan_ovo pour générer/télécharger Excel indépendamment | Absent (seulement auto-trigger) |
| Pipeline state detection | `getPipelineState()` pour adapter le label du bouton | Absent |

### Plan d'implémentation

**Fichier modifié : `src/components/dashboard/CoachDashboard.tsx`**

Réécrire le bloc `if (detailTab === 'mirror')` (lignes ~777-1145) pour reproduire exactement le layout entrepreneur :

1. **Adopter le layout app-shell** : `h-screen flex flex-col` avec header compact, barre IR, flex principal (sidebar + contenu), et barre modules en bas — même structure que `EntrepreneurDashboard` lignes 819-1384.

2. **Ajouter la barre IR Score** : bandeau sombre `bg-[hsl(222,47%,15%)]` avec score global calculé depuis `entDelivs`, label maturité, compteur de livrables. Pas de graphe historique (pas de `score_history` chargé côté coach).

3. **Sidebar Sources** : passer de `lg:col-span-1 Card` à un vrai panel `w-72 flex-none border-r` identique à l'entrepreneur, avec les mêmes zones d'upload (BMC/SIC, Inputs, Supplémentaires) et listing des fichiers.

4. **Barre titre module** : ajouter `h-12 border-b` au-dessus du contenu avec `selectedMod.icon` + `selectedMod.title`.

5. **Bouton "Générer" flottant** : `fixed bottom-20 left-2` avec `handleGenerateMirror`, ajouter `getPipelineState` pour afficher l'état smart + bouton "Régénération complète" (appeler `handleGenerateMirror` avec force).

6. **Bannière non-bloquante** : remplacer l'overlay bloquant par une `fixed top-0` bannière de progression identique à l'entrepreneur pendant la génération.

7. **Animation pipeline dans barre modules** : répliquer la logique `pipelineStepMap`/`isGeneratingThis`/`isPipelineDone`/`isPipelineWaiting` de l'entrepreneur pour les animations de spinner, checkmark et opacité.

8. **OVO Excel dans barre plan_ovo** : ajouter le bouton "Générer mon Plan Financier OVO" / "Télécharger" dans la barre contextuelle plan_ovo, appelant `handleGenerateOvoPlanCoach`.

9. **Ajouter le state `pipelineState`** : importer `getPipelineState` et calculer l'état à partir de `selectedEnt.id` pour piloter le bouton flottant.

### Résultat attendu

La vue miroir sera visuellement et fonctionnellement identique à la vue entrepreneur : même layout app-shell, même barre IR, même sidebar sources, même bouton flottant intelligent, même animations pipeline, même téléchargements disponibles.

