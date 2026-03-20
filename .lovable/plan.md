

## Diagnostic : "Load failed" sur le Mémo d'Investissement

### Problème

L'edge function `generate-investment-memo` prend ~2.5 minutes pour la Passe 1 (appel AI). La connexion HTTP se ferme avant que la réponse 202 ne soit envoyée (`Http: connection closed before message completed`). Le navigateur reçoit `TypeError: Load failed`.

Les logs montrent que le checkpoint `updateMemoModuleState` à la ligne 331 s'exécute **juste avant** le `return`, mais la connexion est déjà morte → le navigateur ne reçoit jamais le 202 → le frontend ne chaîne pas la Passe 2.

La DB confirme : aucun `enterprise_modules` n'a été mis à jour (tous `phase: nil, progress: 0`). Cela signifie que même l'upsert échoue — probablement parce que le runtime Deno tue le processus avant que l'upsert ne se complète.

### Solution : Frontend resilient + polling

Au lieu de compter sur la réponse HTTP, le frontend doit **poller** la table `enterprise_modules` après un échec réseau pour détecter si la Passe 1 a réussi malgré tout.

### Changements

**1. `src/components/dashboard/EntrepreneurDashboard.tsx` — `handleGenerateModule`**

Dans le `catch` pour `investment_memo`, au lieu de juste afficher l'erreur :
- Poller `enterprise_modules` pendant 30 secondes pour vérifier si `phase = 'part1_completed'`
- Si oui, afficher un toast info et lancer la Passe 2 automatiquement
- Si non, vérifier si `phase = 'part1'` (en cours) et attendre plus longtemps (poller 2 min)
- Si toujours rien, afficher l'erreur classique

**2. `supabase/functions/generate-investment-memo/index.ts` — Sauvegarder le checkpoint AVANT l'appel AI**

Déplacer le `updateMemoModuleState` avec `phase: "part1"` **avant** `callAI`, et ajouter un `try/finally` pour s'assurer que le résultat de la Passe 1 est sauvegardé même si la connexion HTTP est coupée. Utiliser `waitUntil` ou un pattern fire-and-forget pour le checkpoint final.

Concrètement :
- Ligne 317-326 : Wraper le `callAI` dans un try/catch qui sauvegarde le résultat dans la DB **immédiatement** après l'appel AI, **avant** d'essayer de retourner la réponse HTTP
- Le `return` de la 202 reste en fin mais n'est plus critique — le frontend pollera la DB

**3. Logique de polling (nouveau helper dans EntrepreneurDashboard)**

```typescript
const pollMemoCheckpoint = async (enterpriseId: string, maxWaitMs = 120000) => {
  const interval = 5000;
  const maxAttempts = Math.ceil(maxWaitMs / interval);
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise(r => setTimeout(r, interval));
    const { data } = await supabase
      .from('enterprise_modules')
      .select('data, status, progress')
      .eq('enterprise_id', enterpriseId)
      .eq('module', 'investment_memo')
      .single();
    const phase = (data?.data as any)?.phase;
    if (phase === 'part1_completed') return 'checkpoint_ready';
    if (phase === 'completed') return 'fully_done';
    if (phase === 'failed') return 'failed';
  }
  return 'timeout';
};
```

### Résumé des fichiers modifiés

| Fichier | Modification |
|---|---|
| `generate-investment-memo/index.ts` | S'assurer que le checkpoint est sauvé AVANT le return HTTP |
| `EntrepreneurDashboard.tsx` | Ajouter polling après échec réseau pour investment_memo, puis chaîner Passe 2 |

