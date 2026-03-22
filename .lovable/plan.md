

# Supprimer l'icône Sparkles (étoile) du tableau coach

## Changement

**Fichier : `src/components/dashboard/CoachDashboard.tsx`**

- Supprimer le bouton `Sparkles` (lignes 578-580) qui se trouve entre le bouton "Voir" et le bouton suppression dans la liste des entreprises. Ce bouton déclenche `handleDownloadReport` mais n'est pas essentiel.
- Nettoyer l'import `Sparkles` de lucide-react s'il n'est plus utilisé ailleurs.

