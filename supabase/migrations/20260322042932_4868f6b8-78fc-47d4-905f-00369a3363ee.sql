
-- ═══════════════════════════════════════════════════════════════════
-- Knowledge Base Architecture — 7 tables
-- ═══════════════════════════════════════════════════════════════════

-- 1. knowledge_benchmarks — Benchmarks sectoriels (couche 2)
CREATE TABLE public.knowledge_benchmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  secteur TEXT NOT NULL,
  pays TEXT NOT NULL DEFAULT 'all',
  zone TEXT DEFAULT 'uemoa',
  
  marge_brute_min NUMERIC, marge_brute_max NUMERIC, marge_brute_mediane NUMERIC,
  marge_ebitda_min NUMERIC, marge_ebitda_max NUMERIC,
  marge_nette_min NUMERIC, marge_nette_max NUMERIC,
  
  ratio_personnel_ca_min NUMERIC, ratio_personnel_ca_max NUMERIC,
  ratio_charges_fixes_ca_min NUMERIC, ratio_charges_fixes_ca_max NUMERIC,
  croissance_ca_max NUMERIC,
  
  multiple_ebitda_min NUMERIC, multiple_ebitda_max NUMERIC,
  multiple_ca_min NUMERIC, multiple_ca_max NUMERIC,
  
  source TEXT NOT NULL,
  source_url TEXT,
  source_type TEXT DEFAULT 'benchmark',
  date_source DATE,
  perimetre TEXT,
  notes TEXT,
  date_mise_a_jour TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(secteur, pays)
);

ALTER TABLE public.knowledge_benchmarks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read benchmarks" ON public.knowledge_benchmarks FOR SELECT TO authenticated USING (true);
CREATE POLICY "Super admin can manage benchmarks" ON public.knowledge_benchmarks FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'super_admin')) WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- 2. knowledge_risk_params — Paramètres WACC par pays (couche 2)
CREATE TABLE public.knowledge_risk_params (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pays TEXT NOT NULL UNIQUE,
  zone TEXT NOT NULL,
  
  risk_free_rate NUMERIC NOT NULL,
  equity_risk_premium NUMERIC NOT NULL,
  country_risk_premium NUMERIC,
  default_spread NUMERIC,
  
  size_premium_micro NUMERIC, size_premium_small NUMERIC, size_premium_medium NUMERIC,
  illiquidity_premium_min NUMERIC, illiquidity_premium_max NUMERIC,
  
  cost_of_debt NUMERIC,
  tax_rate NUMERIC,
  taux_directeur NUMERIC,
  
  decote_illiquidite NUMERIC DEFAULT 25,
  decote_taille_micro NUMERIC DEFAULT 20,
  decote_taille_small NUMERIC DEFAULT 10,
  decote_gouvernance_no_audit NUMERIC DEFAULT 5,
  decote_gouvernance_no_board NUMERIC DEFAULT 8,
  
  risque_pays_label TEXT,
  risque_pays_prime NUMERIC,
  
  source TEXT NOT NULL,
  source_url TEXT,
  date_source DATE,
  date_mise_a_jour TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.knowledge_risk_params ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read risk_params" ON public.knowledge_risk_params FOR SELECT TO authenticated USING (true);
CREATE POLICY "Super admin can manage risk_params" ON public.knowledge_risk_params FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'super_admin')) WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- 3. knowledge_country_data — Données macro par pays (couche 2)
CREATE TABLE public.knowledge_country_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pays TEXT NOT NULL UNIQUE,
  
  pib_usd_millions NUMERIC,
  croissance_pib_pct NUMERIC,
  inflation_pct NUMERIC,
  population_millions NUMERIC,
  
  cadre_comptable TEXT DEFAULT 'SYSCOHADA',
  devise TEXT DEFAULT 'XOF',
  taux_is NUMERIC,
  taux_tva NUMERIC,
  cotisations_sociales_pct NUMERIC,
  salaire_minimum NUMERIC,
  salaire_dirigeant_pme_min NUMERIC,
  salaire_dirigeant_pme_max NUMERIC,
  
  corruption_index NUMERIC,
  risque_politique TEXT,
  
  taux_emprunt_pme NUMERIC,
  acces_credit_pme_pct NUMERIC,
  
  source TEXT,
  date_mise_a_jour TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.knowledge_country_data ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read country_data" ON public.knowledge_country_data FOR SELECT TO authenticated USING (true);
CREATE POLICY "Super admin can manage country_data" ON public.knowledge_country_data FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'super_admin')) WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- 4. knowledge_risk_factors — Risques terrain (couche 2)
CREATE TABLE public.knowledge_risk_factors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  categorie TEXT NOT NULL,
  
  titre TEXT NOT NULL,
  description TEXT NOT NULL,
  signaux JSONB NOT NULL,
  correction TEXT,
  
  secteurs_concernes TEXT[],
  pays_concernes TEXT[],
  severity TEXT DEFAULT 'medium',
  
  source TEXT,
  is_active BOOLEAN DEFAULT true
);

ALTER TABLE public.knowledge_risk_factors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read risk_factors" ON public.knowledge_risk_factors FOR SELECT TO authenticated USING (true);
CREATE POLICY "Super admin can manage risk_factors" ON public.knowledge_risk_factors FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'super_admin')) WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- 5. knowledge_sources — Index de toutes les sources (couche 2)
CREATE TABLE public.knowledge_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  nom TEXT NOT NULL,
  organisme TEXT NOT NULL,
  type_source TEXT NOT NULL,
  
  url TEXT,
  acces TEXT DEFAULT 'public',
  
  themes TEXT[],
  pays_couverts TEXT[],
  secteurs_couverts TEXT[],
  
  date_publication DATE,
  frequence_mise_a_jour TEXT,
  perimetre_temporel TEXT,
  
  utilise_dans TEXT[],
  priorite INTEGER DEFAULT 5,
  
  notes TEXT
);

ALTER TABLE public.knowledge_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read sources" ON public.knowledge_sources FOR SELECT TO authenticated USING (true);
CREATE POLICY "Super admin can manage sources" ON public.knowledge_sources FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'super_admin')) WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- 6. aggregated_benchmarks — Benchmarks auto-enrichis (couche 4)
CREATE TABLE public.aggregated_benchmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  secteur TEXT NOT NULL,
  pays TEXT NOT NULL,
  
  nb_entreprises INTEGER DEFAULT 0,
  marge_brute_p25 NUMERIC,
  marge_brute_mediane NUMERIC,
  marge_brute_p75 NUMERIC,
  marge_ebitda_mediane NUMERIC,
  ca_mediane NUMERIC,
  effectifs_mediane INTEGER,
  
  derniere_agregation TIMESTAMPTZ,
  
  UNIQUE(secteur, pays)
);

ALTER TABLE public.aggregated_benchmarks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read aggregated_benchmarks" ON public.aggregated_benchmarks FOR SELECT TO authenticated USING (true);
CREATE POLICY "Super admin can manage aggregated_benchmarks" ON public.aggregated_benchmarks FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'super_admin')) WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- 7. workspace_knowledge — Données propriétaires (couche 3)
CREATE TABLE public.workspace_knowledge (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL,
  
  type TEXT NOT NULL,
  cle TEXT NOT NULL,
  valeur JSONB NOT NULL,
  
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(owner_id, type, cle)
);

ALTER TABLE public.workspace_knowledge ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own workspace_knowledge" ON public.workspace_knowledge FOR SELECT TO authenticated USING (owner_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Users can manage own workspace_knowledge" ON public.workspace_knowledge FOR ALL TO authenticated USING (owner_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin')) WITH CHECK (owner_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'));
