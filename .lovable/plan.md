

# Élargir la vue Coaching à pleine largeur

## Problème
Le composant `CoachingTab` utilise `max-w-2xl` (672px max), ce qui le rend étroit dans le dashboard coach. La zone de contenu devrait occuper toute la largeur disponible.

## Changement

**Fichier : `src/components/dashboard/CoachingTab.tsx`**
- Ligne 135 : Remplacer `className="space-y-4 max-w-2xl"` par `className="space-y-4"` pour supprimer la contrainte de largeur maximale.

Un seul changement, une seule ligne.

