

# Plan : Système RAG avec base de connaissances pour les agents IA

## Ce que contient le document uploadé

Le fichier `SOURCES_BAILLEURS_ENTREPRENEURIAT_AFRIQUE.docx` (14 pages) est un guide de référence complet qui liste :
- Bailleurs de fonds (Enabel, GIZ, BAD, AFD, IFC, PNUD, etc.)
- Benchmarks sectoriels Afrique (agriculture, tech, industrie)
- Données macroéconomiques (BCEAO, FMI, Banque Mondiale)
- Mapping précis : quelle source pour quel agent IA
- Critères d'éligibilité PME par bailleur

## Ce qu'il faut construire

### 1. Table `knowledge_base` en base de données
Stocker les données de référence structurées :
```
- id, category (bailleurs | benchmarks | fiscal | secteurs | odd)
- title, content (texte), metadata (JSON)
- source, country, sector (filtres)
- embedding (optionnel, pour recherche vectorielle future)
```

### 2. Fonction `buildRAGContext()` dans helpers.ts
Avant chaque appel IA, récupérer automatiquement les données pertinentes depuis `knowledge_base` en filtrant par :
- Pays de l'entreprise
- Secteur d'activité
- Catégorie pertinente pour l'agent (ex: "bailleurs" pour le diagnostic, "benchmarks" pour les inputs financiers)

### 3. Ingestion des données
- Créer une edge function `ingest-knowledge` qui parse les documents uploadés et les structure en entrées `knowledge_base`
- Le document actuel serait le premier à ingérer

### 4. Enrichir chaque agent avec le contexte RAG
Injecter les données pertinentes dans le `userPrompt` de chaque edge function, en plus des documents uploadés par l'entrepreneur.

## Stratégie modèles (rappel)
- **Opus 4** pour les 3 fonctions financières critiques (inputs, framework, business-plan)
- **Sonnet 4** pour le reste (BMC, SIC, diagnostic, ODD, etc.)

## Ce que vous pouvez m'envoyer

Oui, envoyez-moi tout ce qui peut servir de base de connaissances :
- Rapports bailleurs (PDF, DOCX)
- Benchmarks sectoriels
- Templates de business plans
- Données fiscales par pays
- Critères d'éligibilité des programmes de financement
- Études de marché sectorielles Afrique

Je les structurerai et les intégrerai dans la base RAG pour que chaque agent puisse les exploiter automatiquement.

## Fichiers à créer/modifier

1. **Migration SQL** — Table `knowledge_base` avec colonnes category, content, metadata, country, sector
2. **`supabase/functions/_shared/helpers.ts`** — Ajouter `buildRAGContext()`, paramètre `model` à `callAI()`
3. **`supabase/functions/ingest-knowledge/index.ts`** — Nouvelle edge function pour ingérer les documents de référence
4. **Toutes les edge functions generate-*/** — Injecter le contexte RAG dans les prompts
5. **Les 3 fonctions financières** — Passer à `claude-opus-4-20250514`

