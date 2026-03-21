

## Problème

Le `DashboardLayout` utilise la classe Tailwind `container` sur le header et le `<main>`, ce qui limite la largeur à ~1280px et centre le contenu. Le contenu ne prend donc pas toute la largeur de l'écran.

## Solution

Remplacer `container` par `max-w-full px-6` (ou `px-8`) dans `DashboardLayout.tsx` pour que le contenu occupe toute la largeur disponible avec un padding latéral raisonnable.

### Fichier : `src/components/dashboard/DashboardLayout.tsx`

- **Ligne 32** : header inner div — remplacer `container` par `w-full px-6`
- **Ligne 67** : main — remplacer `container` par `w-full px-6`

Cela donnera un layout pleine largeur tout en gardant un espacement latéral propre.

