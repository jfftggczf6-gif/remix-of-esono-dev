

## Constat

Le modal force un choix "Reconstruction vs Due Diligence" avant même que l'utilisateur ait uploadé quoi que ce soit. En réalité :

- Le **ReconstructionUploader** est déjà un composant visible dans le dashboard
- La **Data Room** pourrait être disponible pour tous
- L'edge function `reconstruct-from-traces` analyse déjà les documents uploadés et produit un `score_confiance` — elle peut donc **auto-détecter** la qualité des données

## Proposition : supprimer le modal, auto-détecter le mode

### Changements

1. **`EntrepreneurDashboard.tsx`** :
   - Supprimer le rendu conditionnel du `ModeSelectionModal`
   - Toujours afficher le `ReconstructionUploader` (zone d'upload universelle)
   - Toujours afficher le bouton Data Room (pas seulement en mode `due_diligence`)
   - Retirer les conditions sur `operating_mode` pour l'affichage des composants

2. **`ModeSelectionModal.tsx`** :
   - Supprimer le fichier (plus utilisé)

3. **Auto-détection côté backend** (optionnel, phase suivante) :
   - Après reconstruction, si `score_confiance >= 70` → marquer `operating_mode = 'due_diligence'` automatiquement
   - Si `score_confiance < 70` → rester en `reconstruction` pour permettre d'ajouter plus de documents
   - Cela se ferait dans l'edge function `reconstruct-from-traces` ou via un simple update côté front après réception du résultat

### Résultat UX
- L'utilisateur uploade ses documents directement
- L'IA analyse et reconstruit
- Si les données sont solides → passage automatique en mode "Due Diligence" avec Data Room activée
- Plus de choix bloquant au démarrage

