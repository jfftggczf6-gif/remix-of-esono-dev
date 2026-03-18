
CREATE OR REPLACE FUNCTION public.search_knowledge(
  query_embedding extensions.vector(1536),
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 10,
  filter_categories TEXT[] DEFAULT NULL,
  filter_country TEXT DEFAULT NULL,
  filter_sector TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  content TEXT,
  category TEXT,
  source TEXT,
  country TEXT,
  sector TEXT,
  similarity FLOAT
)
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    kb.id,
    kb.title,
    kb.content,
    kb.category,
    kb.source,
    kb.country,
    kb.sector,
    (1 - (kb.embedding <=> query_embedding))::FLOAT AS similarity
  FROM public.knowledge_base kb
  WHERE
    kb.embedding IS NOT NULL
    AND (filter_categories IS NULL OR kb.category = ANY(filter_categories))
    AND (filter_country IS NULL OR kb.country IS NULL OR kb.country ILIKE '%' || filter_country || '%')
    AND (filter_sector IS NULL OR kb.sector IS NULL OR kb.sector ILIKE '%' || filter_sector || '%')
    AND (1 - (kb.embedding <=> query_embedding))::FLOAT > match_threshold
  ORDER BY kb.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
