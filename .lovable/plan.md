

## Fix complet Plan Financier OVO — 7 bugs identifiés

L'utilisateur a fourni un audit détaillé du fichier Excel généré, identifiant 7 bugs dont 4 critiques qui expliquent pourquoi le fichier est vide/incorrect.

### Bugs à corriger

| # | Sévérité | Problème | Cause |
|---|----------|----------|-------|
| 1 | Critique | Cellules en DOUBLE dans le XML | Le regex ne matche pas les cellules `t="s"` (sharedStrings) → double cellule → Excel affiche l'ancienne valeur |
| 2 | Critique | Staff CURRENT YEAR = 0 | Col S = formule `(Q+R)/2`, le code essaie d'y écrire → ignoré. Q et R (H1/H2) ne sont pas écrits |
| 3 | Critique | Volumes YEAR2-YEAR5 = 0 | L'IA ne génère pas les volumes futurs car le prompt ne l'exige pas assez |
| 4 | Critique | Prix en gamme 3 au lieu de gamme 1 | L'IA met tout en `unit_price_r3` avec `range_flags=[0,0,1]` au lieu de r1 |
| 5 | Mineur | Logs formula cells trop verbeux | `console.warn` par cellule formule noie les logs |
| 6 | Mineur | Template pas auto-uploadé | Si le template manque dans le storage, pas de fallback |
| 7 | Mineur | Pas de normalisation slots produits/services | L'ordre des slots peut être incohérent |

### Plan d'implémentation

**Fichier unique modifié** : `supabase/functions/generate-ovo-plan/index.ts`

**Fichier créé** : `supabase/functions/_shared/ovo-template-b64.ts` (template base64 embarqué)

#### 1. Migration SQL — RLS policies storage buckets
Ajouter les policies manquantes pour `ovo-templates` (service role read/insert) et `ovo-outputs` (authenticated read, service role insert).

#### 2. Créer `ovo-template-b64.ts`
Fichier contenant le template Excel encodé en base64 (~1.4MB). Copié depuis le fichier uploadé par l'utilisateur.

#### 3. Modifications dans `generate-ovo-plan/index.ts`

**3a** — Importer le template base64 + ajouter `ensureTemplate()` qui auto-upload le template si absent du storage.

**3b** — Fix Bug #1 (critique) : Remplacer `applyWritesToXml` avec un regex élargi qui matche TOUTES les variantes de cellules (`t="s"`, `t="str"`, `t="inlineStr"`, self-closing, sans `t=`). Ne plus skip les formules pour les cellules qu'on veut écrire — les remplacer directement.

**3c** — Fix Bug #2 (critique) : Modifier `wFinance` pour toujours skip la colonne S (formule auto). Réécrire la section Staff FinanceData pour écrire dans les colonnes Q (H1) et R (H2) au lieu de S, permettant à la formule Excel `S=(Q+R)/2` de calculer automatiquement.

**3d** — Fix Bug #3 (critique) : Ajouter une contrainte dans le system prompt exigeant que chaque produit/service actif ait des entrées per_year pour YEAR2-YEAR6 avec des volumes non-nuls.

**3e** — Fix Bug #4 (critique) : Ajouter une fonction `normalizeRangeData()` qui, si l'IA met tout en r3 ou r2 avec r1=0, ramène automatiquement les prix/COGS/mix en r1 avec `range_flags=[1,0,0]`.

**3f** — Fix Bug #5 : Remplacer le `console.warn` par cellule formule par un compteur agrégé.

**3g** — Normaliser les slots produits/services : trier par slot avant les boucles RevenueData.

#### 4. Créer `upload-ovo-template` Edge Function (optionnel)
Endpoint pour uploader manuellement le template si besoin.

#### 5. Frontend — déjà géré
Le timeout et polling sont déjà en place depuis les modifications précédentes.

### Résultat attendu
- Cellule J5 = nom entreprise réel (plus "IMPOT SUR LE REVENU")
- Staff headcount S213 > 0 (calculé depuis Q+R)
- Volumes YEAR2-YEAR5 non-nuls
- Prix en gamme 1 (standard) quand une seule gamme est utilisée

