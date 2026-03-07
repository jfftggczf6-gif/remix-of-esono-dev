

## Problème : Avertissement "éléments XML personnalisés" à l'ouverture du .docx

L'erreur Word "Ce fichier comporte des éléments XML personnalisés qui ne sont plus pris en charge" est causée par la bibliothèque `npm:docx@8` qui injecte des Custom XML Parts dans le package OOXML. Word les détecte et affiche cet avertissement.

### Solution

**Fichier : `supabase/functions/generate-business-plan/index.ts`**

Après la génération du buffer via `Packer.toBuffer(doc)`, post-traiter le fichier .docx (qui est un ZIP) avec JSZip pour supprimer les Custom XML Parts avant l'upload :

1. Charger le buffer docx dans JSZip
2. Supprimer tous les fichiers sous `customXml/` dans le ZIP
3. Nettoyer les références correspondantes dans `[Content_Types].xml` (supprimer les `<Override>` pointant vers `customXml`)
4. Nettoyer `word/_rels/document.xml.rels` (supprimer les `<Relationship>` de type `customXml`)
5. Re-compresser et utiliser ce buffer nettoyé pour l'upload

Cela élimine l'avertissement Word sans affecter le contenu du document.

### Détails techniques

```text
generateWordDoc(bp)
  -> Packer.toBuffer(doc)      // docx@8 génère le ZIP avec customXml/
  -> stripCustomXml(buffer)    // NEW: JSZip post-processing
      - zip.remove("customXml/*")
      - patch [Content_Types].xml
      - patch word/_rels/document.xml.rels
  -> upload clean buffer
```

Ajout de l'import JSZip (déjà disponible dans l'écosystème Deno du projet via les autres edge functions). Une seule fonction `stripCustomXml()` d'environ 30 lignes.

