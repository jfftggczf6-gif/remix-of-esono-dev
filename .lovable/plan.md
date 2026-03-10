

# Plan : Aligner les scénarios OVO avec les scénarios Framework

## Probleme

Le screenshot le montre clairement : les 3 scenarios du Plan Financier Final (OVO) affichent **exactement les memes chiffres** :
- CA An 5 : 196,877,475 (x3)
- EBITDA An 5 : 61,067,166 (x3)
- Resultat An 5 : 42,747,016 (x3)

Alors que le Framework a des scenarios bien differencies :
- **Prudent** : CA 157M, EBITDA 47M, Resultat 33M
- **Central** : CA 197M, EBITDA 61M, Resultat 43M
- **Ambitieux** : CA 256M, EBITDA 82M, Resultat 57M

### Cause racine

Dans `normalizers.ts` lignes 537-546, la fonction `enforceFrameworkConstraints` ecrase les 3 scenarios OVO avec les memes valeurs centrales (`data.revenue.year6`, etc.) :

```typescript
// Actuel - BUGUE : utilise les memes valeurs pour les 3 scenarios
for (const sc of ['optimiste', 'realiste', 'pessimiste']) {
  data.scenarios[sc].revenue_year5 = data.revenue.year6;    // toujours la meme valeur
  data.scenarios[sc].ebitda_year5 = data.ebitda.year6;      // toujours la meme valeur
  data.scenarios[sc].net_profit_year5 = data.net_profit.year6; // toujours la meme valeur
}
```

Le Framework stocke ses scenarios dans `scenarios.tableau` avec des colonnes `prudent/central/ambitieux` par indicateur (CA An 5, EBITDA An 5, Resultat Net, etc.).

## Solution

**Fichier** : `supabase/functions/_shared/normalizers.ts`

Modifier la section scenarios (lignes 537-546) de `enforceFrameworkConstraints` pour :

1. Lire le `frameworkData.scenarios.tableau` et extraire les valeurs par scenario (prudent, central, ambitieux)
2. Mapper correctement : pessimiste=prudent, realiste=central, optimiste=ambitieux
3. Parser les valeurs textuelles ("157M FCFA" -> 157000000) car le Framework stocke les chiffres en format texte
4. Recalculer la VAN et le TRI proportionnellement pour chaque scenario au lieu d'utiliser les memes valeurs

Le mapping sera :
| OVO scenario | Framework scenario | CA An 5 | EBITDA An 5 | Resultat Net |
|---|---|---|---|---|
| pessimiste | prudent | 157M | 47M | 33M |
| realiste | central | 197M | 61M | 43M |
| optimiste | ambitieux | 256M | 82M | 57M |

## Fichiers impactes

| Fichier | Changement |
|---|---|
| `supabase/functions/_shared/normalizers.ts` | Corriger le mapping des scenarios dans `enforceFrameworkConstraints` |

