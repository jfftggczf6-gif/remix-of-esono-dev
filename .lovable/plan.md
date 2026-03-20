

## Plan : Aligner le rendu du Mémo d'Investissement sur les formats cibles

### Problèmes identifiés

1. **HTML téléchargé** : Le `handleDownloadHtml` dans `InvestmentMemoViewer.tsx` génère un HTML basique (Georgia, layout simple) alors que le format cible est un document A4 professionnel avec page de garde navy, table des matières avec pagination, callout boxes, info grids, tableaux stylisés, badges de scoring, etc.

2. **Onglet PPTX non visible** : L'onglet PPTX existe dans le composant mais l'utilisateur ne le voit pas. Probablement un problème de Tabs `defaultValue="html"` — l'onglet est là mais l'UI peut être tronquée ou le contenu pas rendu si le composant reçoit des données incomplètes.

3. **Rendu in-dashboard** : Le `renderSection` est générique (clé/valeur) pour la plupart des sections au lieu d'un rendu structuré avec KPIs, grilles, tableaux comme dans le format cible.

### Changements prévus

**Fichier 1 : `src/components/dashboard/InvestmentMemoViewer.tsx`**

A. **Réécriture complète du `handleDownloadHtml`** — Remplacer la génération HTML actuelle (lignes 80-209) par un HTML qui reproduit fidèlement le format cible :
   - Page de garde avec gradient navy, badge "Confidentiel", titre, sous-titre, métadonnées, footer ESONO
   - Table des matières avec items numérotés et lignes pointillées
   - Sections structurées : callout boxes (`.co`), info grids (`.ig`), score badges (`.sb`), verdict banners (`.vd`)
   - Tableaux avec headers navy, badges probabilité/impact colorés
   - Thèse positive/négative en deux colonnes (`.tc .cc-g / .cc-r`)
   - Footer paginé, styles d'impression A4
   - CSS complet reprenant les variables et classes du fichier cible

B. **Amélioration du `renderSection`** (lignes 211-315) — Ajouter des rendus spécifiques pour les sections actuellement génériques :
   - `presentation_entreprise` : grille d'infos (raison sociale, forme juridique, etc.)
   - `analyse_marche` : TAM/SAM cards
   - `modele_economique` : tableau sources de revenus
   - `equipe_et_gouvernance` : profils + gaps identifiés
   - `esg_impact` : badges ODD + conformité IFC
   - `structure_proposee` : grille instrument/montant/dilution
   - `annexes` : listes formatées

C. **Onglet PPTX** — S'assurer que le TabsTrigger PPTX est bien visible. Vérifier que la grille de preview des slides et le bouton de téléchargement sont correctement rendus.

**Fichier 2 : `src/lib/memo-pptx-generator.ts`** (ajustements mineurs)
   - Vérifier que les slides correspondent à la structure du PPTX cible (cover avec cercle décoratif, slides de contenu avec footer "ESONO — Investment Memorandum — [Nom] — Confidentiel", numérotation)
   - Ajouter le footer commun sur chaque slide
   - Ajuster la slide résumé exécutif pour avoir le score IR et le verdict dans des encarts à droite (comme dans le PPTX cible)

### Résumé technique

| Fichier | Modification |
|---|---|
| `InvestmentMemoViewer.tsx` | Réécriture handleDownloadHtml + amélioration renderSection + fix onglet PPTX |
| `memo-pptx-generator.ts` | Footer commun + layout résumé exécutif aligné sur le PPTX cible |

