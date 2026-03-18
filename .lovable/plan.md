

## Problème

Deux causes identifiées :

1. **Le trigger `on_auth_user_created` est manquant** — la migration précédente a créé la fonction `handle_new_user()` mais le trigger n'a pas été appliqué (probablement car il référence `auth.users`, un schéma réservé, et la migration a échoué silencieusement). Sans ce trigger, aucun profil ni rôle n'est créé au signup.

2. **Le compte `philippeyace@hotmail.fr` a été créé avant l'activation de l'auto-confirm** — l'email n'a jamais été confirmé, donc le login échoue systématiquement.

## Plan de correction

### 1. Recréer le trigger via migration SQL

Utiliser `CREATE TRIGGER IF NOT EXISTS` sur `auth.users` pour que `handle_new_user()` se déclenche à chaque inscription. Note : les triggers sur `auth.users` fonctionnent quand ils appellent une fonction dans le schéma `public` avec `SECURITY DEFINER`.

```sql
-- Recréer le trigger (drop + create pour éviter les conflits)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### 2. Confirmer manuellement le compte existant

Comme l'auto-confirm n'était pas actif lors de la création du compte `philippeyace@hotmail.fr`, il faut soit :
- **Option A** : Supprimer l'utilisateur existant via SQL et le recréer (plus propre)
- **Option B** : Confirmer manuellement l'email via une requête admin

L'option A est recommandée : supprimer l'utilisateur orphelin et recréer le compte.

```sql
-- Supprimer l'utilisateur non confirmé pour permettre une réinscription propre
DELETE FROM auth.users WHERE email = 'philippeyace@hotmail.fr';
```

### 3. Vérifier que l'auto-confirm est bien actif

S'assurer que le paramètre `autoConfirmEmails` est bien en place pour les futures inscriptions.

---

### Résumé des actions

| Étape | Action |
|---|---|
| Migration SQL | Créer le trigger `on_auth_user_created` sur `auth.users` |
| Migration SQL | Supprimer l'utilisateur non confirmé |
| Vérification | Confirmer que l'auto-confirm email est actif |

Après ça, tu pourras recréer ton compte et te connecter directement.

