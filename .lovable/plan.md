

## Plan : Vue Miroir = Copie exacte du Dashboard Entrepreneur

### Probleme actuel

La Vue Miroir du coach (onglet "Vue Entrepreneur") est une version simplifiee qui differe du vrai dashboard entrepreneur sur plusieurs points :

1. **Grille d'icones en bas** : 8 modules avec couleurs hex (`#059669`) au lieu de 7 modules avec classes Tailwind (`bg-orange-100 text-orange-600`), pas de `shortTitle`, pas de checkmark de completion
2. **Aucune barre de telechargement contextuelle** : manquent les barres colorees pour Diagnostic (orange), BMC (emerald), SIC (teal), Framework (xlsx+html), Plan OVO (generer/telecharger xlsm), Business Plan (docx), ODD (xlsm+html)
3. **Pas de generation individuelle** par module (seul "Generer les livrables" global existe)
4. **Layout different** : utilise `DashboardLayout` au lieu du layout h-screen fixe de l'entrepreneur

### Solution

Transformer l'onglet "mirror" du CoachDashboard pour qu'il reproduise exactement l'interface entrepreneur, avec toutes les actions fonctionnelles.

### Modifications dans `CoachDashboard.tsx`

**1. Aligner la grille d'icones en bas (lignes ~951-981)**
- Retirer `inputs` de la grille miroir (l'entrepreneur ne le voit pas)
- Utiliser les memes 7 modules que `EntrepreneurDashboard` avec classes Tailwind, `shortTitle`, et checkmark de completion
- Meme layout : `h-12 w-12 rounded-2xl` avec `ring-2 ring-primary` quand selectionne

**2. Ajouter les barres de telechargement contextuelles (au-dessus du contenu central, lignes ~936-948)**
Reproduire les 7 barres du dashboard entrepreneur :
- Diagnostic → barre orange avec bouton "Rapport HTML"
- BMC → barre emerald avec "Rapport HTML"  
- SIC → barre teal avec "Rapport HTML"
- Framework → barre emerald avec "Framework Excel (.xlsx)" + "Rapport HTML"
- Plan OVO → barre emerald avec "Telecharger Plan Financier Excel" ou "Generer"
- Business Plan → barre indigo avec "Telecharger Word (.docx)" ou "Generer"
- ODD → barre emerald avec "ODD Excel (.xlsm)" + "Rapport HTML"

**3. Ajouter les fonctions de telechargement et generation individuelle**
- `handleDownloadCoach(type, format, enterpriseId)` : appel a l'edge function `download-deliverable` avec le token du coach
- `handleGenerateModuleCoach(moduleCode, enterpriseId)` : appel a l'edge function individuelle du module
- `handleGenerateOvoPlanCoach(enterpriseId)` : generation du Plan OVO Excel pour l'entreprise selectionnee
- `handleDownloadBpWordCoach(url)` : telechargement du Business Plan Word

**4. Bouton "Regenerer les livrables" en overlay**
Ajouter le meme bouton fixe en bas a gauche que l'entrepreneur voit dans la vue miroir.

### Fichier modifie
- `src/components/dashboard/CoachDashboard.tsx` uniquement

### Resultat attendu
La Vue Miroir devient une replique exacte du dashboard entrepreneur : memes icones, memes couleurs, memes boutons de telechargement/generation, memes actions en temps reel. Le coach peut agir a la place de l'entrepreneur sur tous les modules.

