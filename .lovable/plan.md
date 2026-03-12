

## Diagnostic complet : pourquoi le fichier ODD paraît "vide"

### Constats (comparaison PRESTIGE vs GOTCHE reference)

En parsant les deux fichiers, le fichier PRESTIGE n'est pas techniquement vide : il contient des `1` en colonnes F/G/H pour les 22 cibles matchées. Mais comparé au fichier GOTCHE de référence, il manque l'essentiel :

**Problème 1 — Mauvaise colonne pour la justification** (bug principal)
- Le code actuel écrit `info_additionnelle` dans la **colonne E**, ce qui **écrase le texte de guidance du template**
- Dans le fichier GOTCHE de référence, la colonne E conserve le texte de guidance du template, et la justification AI va dans la **colonne K** ("Question 1 à répondre")
- Les remarques/questions additionnelles vont dans la **colonne L** ("Question 2 à répondre")
- Résultat : colonnes K et L vides dans le fichier PRESTIGE = impression de fichier "vide"

**Problème 2 — Données ODD obsolètes (ancien format)**
- La base contient encore l'ancien `odd_analysis` avec des target_id comme `1.2`, `2.3`, `3.1` au lieu de `2.a`, `7.2a`, `9.b`
- Résultat : seulement 22/41 cibles matchées, 19 cibles marquées "besoin d'aide" par défaut
- Le `generate-odd` n'a pas été ré-exécuté (logs vides) — la pipeline le saute car les données existent

**Problème 3 — Scores à 0**
- La colonne J (Score positif envers ODD) affiche `0` partout alors que le GOTCHE montre des valeurs
- Probablement lié aux formules de calcul qui ne se recalculent pas correctement

### Plan de correction

#### 1. Corriger le mapping des colonnes dans `fillTargetRow`
**Fichier** : `supabase/functions/_shared/odd-excel-template.ts`

Modifier `fillTargetRow` :
- **Ne plus écrire en E** (conserver le texte de guidance du template)
- **Écrire justification/info_additionnelle en colonne K**
- **Écrire une question optionnelle en colonne L**
- F/G/H/I restent inchangés (correct)

#### 2. Préserver les attributs de style lors du remplacement de cellules
**Fichier** : `supabase/functions/_shared/odd-excel-template.ts`

Modifier `setCellInXml` pour extraire et conserver l'attribut `s="X"` des cellules existantes lors du remplacement. Cela évite que les valeurs 1 dans F/G/H deviennent invisibles à cause d'un style perdu.

#### 3. Forcer la régénération ODD dans la pipeline
**Fichier** : `src/lib/pipeline-runner.ts`

Ajouter une détection de version : si `odd_analysis` n'a pas `target_matrix_version: "v2_template_aligned"` dans ses métadonnées, considérer le module comme obsolète et ne pas le sauter.

#### 4. Ne pas supprimer calcChain.xml
**Fichier** : `supabase/functions/_shared/odd-excel-template.ts`

Retirer `zip.remove("xl/calcChain.xml")` pour préserver les formules de la colonne J.

### Fichiers modifiés
- `supabase/functions/_shared/odd-excel-template.ts` (colonnes, styles, calcChain)
- `src/lib/pipeline-runner.ts` (détection version ODD pour forcer régénération)

### Aucune migration DB nécessaire

