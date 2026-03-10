

# Plan : Ajouter la réinitialisation de mot de passe

Le problème "Invalid login credentials" vient de mots de passe oubliés ou de comptes créés avant l'auto-confirmation. La solution : ajouter un flux "Mot de passe oublié".

## Fichiers à créer/modifier

### 1. Créer `src/pages/ForgotPassword.tsx`
- Formulaire avec champ email
- Appelle `supabase.auth.resetPasswordForEmail(email, { redirectTo: origin + '/reset-password' })`
- Message de confirmation après envoi

### 2. Créer `src/pages/ResetPassword.tsx`
- Vérifie le token `type=recovery` dans le hash URL
- Formulaire nouveau mot de passe + confirmation
- Appelle `supabase.auth.updateUser({ password })`
- Redirige vers `/dashboard` après succès

### 3. Modifier `src/pages/Login.tsx`
- Ajouter un lien "Mot de passe oublié ?" sous le champ mot de passe

### 4. Modifier `src/App.tsx`
- Ajouter les routes `/forgot-password` et `/reset-password` (publiques)

