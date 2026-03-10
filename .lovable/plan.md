

# Audit Financier Complet — État Actuel Post-Corrections

## Réponse à ta question

**Oui, exactement.** Avant les corrections précédentes, les données Inputs (compte de résultat réel extrait des documents) n'étaient **pas correctement injectées** comme base du plan financier. L'IA du Plan OVO inventait ses propres valeurs `current_year`, ce qui faussait tous les calculs CAGR/TRI. Les corrections précédentes ont ajouté l'ancrage dans `enforceFrameworkConstraints`, mais il reste encore des problemes.

---

## Problemes Restants Detectes

### 1. HAUTE — Prompt `generate-plan-ovo` : CAGR dit `1/5` au lieu de `1/6`

Le system prompt (ligne 28-30) dit encore :
```
CAGR Revenue = (Revenue_Year6 / Revenue_CurrentYear)^(1/5) - 1
CAGR EBITDA = (EBITDA_Year6 / EBITDA_CurrentYear)^(1/5) - 1
```
Le code dans `normalizers.ts` a ete corrige en `1/6`, mais le **prompt** dit toujours `1/5`. L'IA pourrait donc generer des CAGR avec le mauvais exposant dans sa reponse initiale (avant la correction programmatique).

**Fix** : Changer `1/5` en `1/6` dans le system prompt de `generate-plan-ovo/index.ts` lignes 28-30.

---

### 2. HAUTE — Pipeline manque le chainage Inputs → Framework

Le `generate-framework` (ligne 203) charge les Inputs via :
```
const inputsData = ctx.deliverableMap["inputs_data"] || ctx.moduleMap["inputs"] || {};
```
Mais si le module Inputs n'a pas ete genere avant le Framework, `inputsData` sera `{}` — le Framework projetera dans le vide sans base historique reelle. Il n'y a **aucune verification** que les Inputs existent avant de lancer le Framework.

**Fix** : Ajouter un warning dans la reponse si `inputsData.compte_resultat` est vide, et indiquer a l'utilisateur de generer les Inputs d'abord.

---

### 3. HAUTE — `generate-business-plan` ne passe pas les Inputs au prompt

Le Business Plan (`generate-business-plan/index.ts` ligne 99) tronque les donnees financieres a 800 chars :
```
FINANCIER : ${JSON.stringify(inp).substring(0, 800)}
```
Et le `syncBusinessPlanWithPlanOvo` (normalizers.ts ligne 692-725) ne synchronise que 3 ans sur 5. Le BP n'a **pas acces** aux donnees completes du bilan, effectifs, etc.

**Impact** : Moyen — le BP est un document narratif, pas un outil de calcul. Mais les chiffres financiers cites dans le BP pourraient etre incoherents.

---

### 4. MOYENNE — `enforceFrameworkConstraints` ne recalcule pas `cashflow` a partir de `net_profit`

Le code ecrase `cashflow` avec les valeurs Framework si elles existent (ligne 509), mais si le Framework n'a pas de ligne cash-flow, le cashflow reste celui genere par l'IA — potentiellement incoherent avec le `net_profit` corrige.

La formule simplifiee devrait etre : `cashflow ≈ net_profit + amortissements`.

**Fix** : Si pas de ligne cashflow dans le Framework, recalculer : `cashflow[yk] = net_profit[yk] + amortissements` (ou utiliser une approximation basee sur EBITDA - impots).

---

### 5. MOYENNE — Scenarios VAN proportionnelle mal calculee

Dans `enforceFrameworkConstraints` (ligne 679-683), la VAN des scenarios est calculee comme un ratio proportionnel du revenue :
```
const ratio = (fw.revenue || centralRev) / centralRev;
data.scenarios[ovoSc].van = Math.round(data.investment_metrics.van * ratio);
```
C'est une approximation grossiere. La VAN devrait etre recalculee avec les cashflows du scenario, pas proportionnellement au CA.

**Fix** : Recalculer la VAN de chaque scenario avec la formule NPV standard en estimant les cashflows proportionnellement.

---

### 6. MOYENNE — Pas de TRI dans les scenarios

Les scenarios ont `van` mais pas de `tri` recalcule. Le champ `tri` dans les scenarios reste a la valeur generee par l'IA, incoherente avec les valeurs Framework ecrasees.

**Fix** : Appliquer Newton-Raphson pour chaque scenario en utilisant les cashflows estimes.

---

### 7. FAIBLE — `generate-ovo-plan` (Excel) ne beneficie pas de `enforceFrameworkConstraints`

La fonction `generate-ovo-plan/index.ts` genere le fichier Excel OVO. Elle appelle l'IA, expand les donnees, mais n'appelle **jamais** `enforceFrameworkConstraints`. Le JSON Plan OVO et l'Excel OVO pourraient donc avoir des chiffres differents.

**Fix** : Apres expansion des donnees, appliquer `enforceFrameworkConstraints` sur les donnees avant injection Excel.

---

## Plan de Corrections

| Priorite | Fichier | Correction |
|---|---|---|
| HAUTE | `generate-plan-ovo/index.ts` | Corriger prompt CAGR `1/5` → `1/6` |
| HAUTE | `generate-framework/index.ts` | Warning si Inputs vides |
| MOYENNE | `normalizers.ts` enforceFrameworkConstraints | Recalculer cashflow si absent du Framework |
| MOYENNE | `normalizers.ts` enforceFrameworkConstraints | Recalculer VAN/TRI par scenario au lieu de ratio proportionnel |
| FAIBLE | `generate-ovo-plan/index.ts` | Appliquer enforceFrameworkConstraints apres expansion |

