
Objectif: fiabiliser définitivement le téléchargement ODD pour que le fichier téléchargé soit toujours un vrai `.xlsx` ODD (jamais un `.xlsm` Plan OVO), quel que soit l’écran.

1) Diagnostic confirmé
- Le backend contient bien des fichiers ODD en `.xlsx` (type `odd_excel`) et des fichiers Plan OVO en `.xlsm` (type `plan_ovo_excel`) séparés.
- La capture montre un fichier `PlanFinancier_...xlsm`, donc un fichier Plan OVO a été téléchargé/ouvrert au lieu du fichier ODD.
- Dans l’UI coach, il reste des labels “XLSM” pour ODD (source de confusion).
- Le flux ODD actuel mélange 2 stratégies (URL signée directe + fallback endpoint), ce qui complexifie le comportement.

2) Plan de correction (code)
- Unifier le téléchargement ODD sur un seul chemin fiable:
  - Appeler systématiquement la fonction backend `download-deliverable?type=odd_analysis&format=xlsx`.
  - Ne plus dépendre du `file_url` stocké pour décider du bouton ODD.
- Harmoniser le nom de fichier côté client:
  - Forcer `NomEntreprise_ODD.xlsx` dans Entrepreneur + Coach + page Livrables.
- Corriger tous les libellés ODD restants:
  - Remplacer les boutons “XLSM” ODD par “XLSX” dans `CoachDashboard.tsx`.
- Garder le téléchargement Plan OVO inchangé (toujours `.xlsm`) pour ne pas casser ce module.

3) Renforcement backend
- Dans `download-deliverable`:
  - Maintenir le `Content-Type` ODD en `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`.
  - Maintenir `Content-Disposition` en `..._ODD.xlsx`.
  - Ajouter un log clair côté fonction pour tracer `type` demandé et fichier réellement servi (diagnostic futur).
- Dans `generate-odd`:
  - Conserver `file_name` comme source de vérité.
  - Éviter d’utiliser une URL publique comme référence fonctionnelle pour un bucket privé (garder métadonnées internes plutôt que dépendre de `file_url`).

4) Vérifications à faire après implémentation
- Test E2E prioritaire:
  - Espace entrepreneur: module ODD → téléchargement → ouverture bureau Excel.
  - Espace coach: onglet parcours + onglet livrables → téléchargement ODD → ouverture.
  - Page `/livrables` → bouton XLSX ODD → ouverture.
- Vérifier que:
  - Le nom téléchargé contient `_ODD.xlsx`.
  - Le fichier ODD s’ouvre sans alerte de format/extension.
  - Le Plan OVO continue à sortir en `.xlsm` et reste téléchargeable.

Section technique (résumé des fichiers à toucher)
- `src/components/dashboard/EntrepreneurDashboard.tsx`
  - Simplifier handler ODD pour passer par `download-deliverable` (type `odd_analysis`, format `xlsx`) + nom forcé `_ODD.xlsx`.
- `src/components/dashboard/CoachDashboard.tsx`
  - Même stratégie unifiée de téléchargement ODD.
  - Corriger textes “XLSM” → “XLSX” sur ODD.
- `src/pages/Livrables.tsx`
  - Vérifier/aligner le nom de fichier ODD et le flux de téléchargement.
- `supabase/functions/download-deliverable/index.ts`
  - Durcir headers/logs pour `odd_analysis` et conserver fallback génération ODD à la volée.
- `supabase/functions/generate-odd/index.ts`
  - Nettoyer l’usage de `file_url` pour éviter les ambiguïtés sur bucket privé.
