

# Plan : Basculer extract-enterprise-info sur la clé Claude

## Problème
Seule `extract-enterprise-info` utilise le gateway Lovable AI (erreur 402 crédits insuffisants). Toutes les autres fonctions utilisent déjà votre clé Anthropic.

## Modification unique

### `supabase/functions/extract-enterprise-info/index.ts`
Remplacer l'appel au gateway Lovable AI par un appel direct à l'API Anthropic avec `ANTHROPIC_API_KEY`, en utilisant `claude-3-5-haiku-20241022` (rapide et économique pour de l'extraction simple).

- Supprimer la référence à `LOVABLE_API_KEY`
- Appeler `https://api.anthropic.com/v1/messages` avec le header `x-api-key`
- Adapter le format de réponse (Anthropic retourne `content[0].text` au lieu de `choices[0].message.content`)
- Garder le même prompt et la même logique de parsing JSON

