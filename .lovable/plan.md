

## Probleme

Le bouton "Démarrer" est masqué car le contenu du modal dépasse la hauteur visible du viewport. Le `DialogContent` n'a pas de scroll et le bouton en bas est coupé.

## Solution

Ajouter `max-h-[90vh] overflow-y-auto` au `DialogContent` pour permettre le défilement quand le contenu dépasse la hauteur de l'écran.

### Fichier modifie

**`src/components/dashboard/ModeSelectionModal.tsx`** (ligne 62) :
- Ajouter les classes `max-h-[90vh] overflow-y-auto` au `DialogContent` pour que le modal soit scrollable et que le bouton "Démarrer" soit toujours accessible.

