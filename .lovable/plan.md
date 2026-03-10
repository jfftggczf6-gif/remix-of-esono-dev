

# Plan : Consultation progressive des livrables pendant la génération

## Problème identifié

Le code actuel a un **overlay plein écran bloquant** (lignes 1390-1409) qui empêche toute interaction pendant la génération :

```
{generating && (
  <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm ...">
    ...
    <p>Veuillez ne pas quitter cette page.</p>
  </div>
)}
```

Le `fetchData()` après chaque étape fonctionne déjà (ligne 308), les données sont bien rafraîchies. Mais l'utilisateur ne peut pas naviguer car l'overlay bloque tout.

## Solution

Remplacer l'overlay bloquant par une **barre de progression non-bloquante** en haut de l'écran, pour que l'utilisateur puisse cliquer sur les modules et consulter les livrables au fur et à mesure.

### Modifications dans `EntrepreneurDashboard.tsx`

1. **Supprimer l'overlay bloquant** (lignes 1390-1409)
2. **Ajouter une barre de progression compacte** sous le header (sticky, non-bloquante) :
   - Barre animée montrant le module en cours
   - Badge indiquant "Génération X/8 : BMC..."
   - L'utilisateur peut naviguer librement entre les modules
3. **Mettre à jour le bouton "Générer"** : garder le `disabled` mais retirer la dépendance à l'overlay

### Fichiers impactés

| Fichier | Changement |
|---|---|
| `src/components/dashboard/EntrepreneurDashboard.tsx` | Remplacement overlay → barre de progression non-bloquante |

---

### Concernant les fonctions de remplissage de template

Les fonctions `odd-excel-template.ts`, `generate-ovo-plan/index.ts`, etc. existent déjà dans le projet actuel, elles ont juste été **adaptées** (extension `.xlsm` → `.xlsx` pour l'ODD, correction du mode de compression pour préserver les macros VBA). Rien n'a été recréé de zéro. La seule nouveauté est `upload-template` qui pousse les fichiers template dans le Storage au premier lancement, car les buckets étaient vides.

