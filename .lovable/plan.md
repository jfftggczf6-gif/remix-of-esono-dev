

# Plan — Corrections Audit #3 (sans point 4)

Corrections a appliquer : points 1, 2, 3, 5, 6, 7, 8 de l'audit #3.

---

## 1. Reordonner le pipeline (`generate-deliverables/index.ts`)

Lignes 10-19 : changer l'ordre pour que le Diagnostic soit en dernier :

```text
BMC → SIC → Inputs → Framework → Plan OVO → Business Plan → ODD → Diagnostic
```

## 2. Appeler `normalizeSic()` dans `generate-sic/index.ts`

Apres `callAI`, appeler `normalizeSic(rawData)` avant la sauvegarde (ligne ~195). L'import existe deja ligne 3.

## 3. Appeler `normalizeBmc()` dans `generate-bmc/index.ts`

Importer `normalizeBmc` depuis `normalizers.ts` et l'appeler sur `bmcData` avant la sauvegarde (ligne ~122).

## 4. Validation bilan dans `normalizeInputs` (`normalizers.ts`)

Apres la construction du bilan (ligne ~148), si `total_actif` et `total_passif` sont > 0 et differents, ajuster le plus petit au plus grand et log un warning.

## 5. Cashflow via EBITDA × (1 - IS%) (`normalizers.ts`)

Lignes 511-523 : remplacer le facteur arbitraire 0.4 par `EBITDA × (1 - taux_IS/100)` en utilisant `getFiscalParams` deja present dans le fichier.

## 6. Ameliorer detection `richTypes` pour Inputs (`generate-deliverables/index.ts`)

Ligne 62 : pour `inputs_data`, verifier en plus que `compte_resultat.chiffre_affaires > 0` avant de considerer le livrable comme "riche".

---

**Fichiers modifies** : 4 fichiers edge functions + 1 shared normalizer. Redeploy automatique.

