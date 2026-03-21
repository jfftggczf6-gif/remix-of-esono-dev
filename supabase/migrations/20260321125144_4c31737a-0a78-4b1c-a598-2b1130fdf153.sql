CREATE TABLE public.inputs_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enterprise_id UUID NOT NULL REFERENCES public.enterprises(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  data JSONB NOT NULL,
  score INTEGER,
  trigger TEXT NOT NULL,
  documents_added TEXT[],
  diff JSONB
);

CREATE INDEX idx_inputs_history_enterprise ON public.inputs_history(enterprise_id, created_at DESC);

ALTER TABLE public.inputs_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view inputs history for their enterprises"
ON public.inputs_history FOR SELECT TO authenticated
USING (
  enterprise_id IN (SELECT id FROM public.enterprises WHERE user_id = auth.uid())
  OR public.has_role(auth.uid(), 'coach')
  OR public.has_role(auth.uid(), 'super_admin')
);