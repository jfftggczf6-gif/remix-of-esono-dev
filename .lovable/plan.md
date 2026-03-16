

## Plan : Extraction complète multi-feuille du template Inputs

### Le problème

Le template Excel "Analyse Financière" contient **8 feuilles structurées** avec des données très riches. Actuellement, le prompt `generate-inputs` n'extrait qu'un sous-ensemble plat (un seul exercice P&L, un bilan, effectifs basiques, produits). Tout le reste est ignoré :

- Historique 3 ans (N-2, N-1, N) avec détail par produit
- Équipe complète avec postes et effectifs
- Coûts variables détaillés (matières, logistique, emballages, commissions) avec grille 60 mois
- Coûts fixes détaillés (loyer, électricité, maintenance, marketing, admin) avec grille 60 mois
- BFR (DSO 45j, DPO 30j, stock 30j) et trésorerie de départ
- CAPEX (5 investissements avec montants, dates, durées amortissement)
- Financement (capital, subventions, prêts avec taux/durée/différé)
- Hypothèses de croissance (objectifs CA 5 ans, taux marge, inflation)

### Plan technique

#### 1. `generate-inputs/index.ts` — Élargir le schéma JSON demandé

Remplacer le JSON actuel par un schéma complet qui capture toutes les feuilles :

```json
{
  "score": <0-100>,
  "periode": "N-2 à N",
  "devise": "XOF",
  "fiabilite": "Élevée|Moyenne|Faible",
  "source_documents": ["..."],

  "informations_generales": {
    "nom": "...", "forme_juridique": "...", "pays": "...", 
    "ville": "...", "secteur": "...", "date_creation": "...",
    "dirigeant": "...", "description_activite": "..."
  },

  "historique_3ans": {
    "n_moins_2": { "ca_total": N, "ca_produit_1": N, ..., "couts_variables": N, "charges_fixes": N, "resultat_exploitation": N, "resultat_net": N, "nombre_clients": N, "nombre_employes": N, "tresorerie": N },
    "n_moins_1": { ... },
    "n": { ... }
  },

  "compte_resultat": { ... existant, basé sur année N ... },
  "bilan": { ... existant ... },

  "produits_services": [
    { "nom": "...", "type": "Produit|Service", "prix_unitaire": N, "cout_unitaire": N, "unite": "...", "marge_pct": N, "volume_annuel": N, "source": "document|estimé_sectoriel" }
  ],

  "equipe": [
    { "poste": "...", "nombre": N }
  ],

  "couts_variables": [
    { "poste": "...", "montant_mensuel": N, "montant_annuel_an1": N }
  ],
  "couts_fixes": [
    { "poste": "...", "montant_mensuel": N, "montant_annuel_an1": N }
  ],

  "bfr": {
    "delai_clients_jours": N, "delai_fournisseurs_jours": N, "stock_moyen_jours": N,
    "tresorerie_depart": N
  },

  "investissements": [
    { "nature": "...", "montant": N, "annee_achat": N, "duree_amortissement_ans": N }
  ],

  "financement": {
    "apports_capital": N,
    "subventions": N,
    "prets": [
      { "source": "...", "montant": N, "taux_pct": N, "duree_mois": N, "differe_mois": N }
    ]
  },

  "hypotheses_croissance": {
    "objectifs_ca": [ { "annee": "N+1", "montant": N }, ... ],
    "taux_marge_brute_cible": N,
    "taux_marge_operationnelle_cible": N,
    "inflation_annuelle": N,
    "augmentation_prix_annuelle": N,
    "croissance_volumes_annuelle": N,
    "taux_is": N
  },

  "effectifs": { "total": N, "cadres": N, "employes": N },
  "kpis": { ... existant ... },
  "donnees_manquantes": [...],
  "hypotheses": [...]
}
```

Le prompt doit aussi préciser : "Analyse CHAQUE feuille/section du document uploadé. Ne te limite pas à un résumé — extrais toutes les données structurées disponibles."

#### 2. `_shared/normalizers.ts` — Enrichir `normalizeInputs`

Ajouter la normalisation des nouveaux champs (`historique_3ans`, `equipe`, `couts_variables`, `couts_fixes`, `bfr`, `investissements`, `financement`, `hypotheses_croissance`). Préserver la compatibilité : si ces champs sont absents (anciens deliverables), les laisser undefined sans casser.

#### 3. `generate-framework/index.ts` — Exploiter les nouvelles données

Injecter dans le prompt Framework les données riches des Inputs :
- Historique 3 ans pour les ratios historiques (au lieu de les inventer)
- CAPEX réel pour le calcul VAN/TRI
- Financement réel (prêts, taux) pour le calcul DSCR
- BFR réel pour les projections trésorerie
- Hypothèses de croissance de l'entrepreneur pour ancrer les projections

#### 4. `generate-ovo-plan/index.ts` — Exploiter les données enrichies

Injecter dans le prompt OVO :
- Coûts variables et fixes réels (au lieu de les estimer)
- CAPEX réel
- Financement réel (prêts avec échéancier)
- Trésorerie de départ

### Impact sur le pipeline

| Donnée | Avant (ignorée) | Après (extraite) | Utilisée par |
|--------|-----------------|-------------------|-------------|
| Historique 3 ans | ❌ | ✅ | Framework (ratios, tendances) |
| Produits avec prix/coûts | ❌ partiellement | ✅ complet | Framework + OVO |
| Équipe détaillée | ❌ | ✅ | OVO (masse salariale) |
| Coûts variables détaillés | ❌ | ✅ | Framework + OVO |
| Coûts fixes détaillés | ❌ | ✅ | Framework + OVO |
| BFR (DSO/DPO/Stock) | ❌ | ✅ | Framework (trésorerie) |
| Trésorerie départ | ❌ | ✅ | Framework + OVO |
| CAPEX | ❌ | ✅ | Framework (VAN/TRI) + OVO |
| Financement (prêts) | ❌ | ✅ | Framework (DSCR) + OVO |
| Hypothèses croissance | ❌ | ✅ | Framework (ancrage projections) |

### Fichiers modifiés

- `supabase/functions/generate-inputs/index.ts` — Schéma JSON élargi + instructions multi-feuille
- `supabase/functions/_shared/normalizers.ts` — Normalisation des nouveaux champs
- `supabase/functions/generate-framework/index.ts` — Injection données enrichies dans le prompt
- `supabase/functions/generate-ovo-plan/index.ts` — Injection coûts, CAPEX, financement, trésorerie

