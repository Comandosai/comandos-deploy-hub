BEGIN;

------------------------------------------------------------
-- 1. EXTENSIONS
------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

------------------------------------------------------------
-- 2. SERVICE FUNCTIONS
------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.update_lead_profile_safe(
  p_lead_id INTEGER,
  p_name TEXT DEFAULT NULL,
  p_phone TEXT DEFAULT NULL,
  p_email TEXT DEFAULT NULL,
  p_qualification_summary TEXT DEFAULT NULL,
  p_purchase_purpose TEXT DEFAULT NULL,
  p_budget_min NUMERIC DEFAULT NULL,
  p_budget_max NUMERIC DEFAULT NULL,
  p_purchase_timeline TEXT DEFAULT NULL,
  p_product_interest TEXT DEFAULT NULL
)
RETURNS TABLE (
  id INTEGER,
  name TEXT,
  phone TEXT,
  email TEXT,
  qualification_summary TEXT,
  purchase_purpose TEXT,
  budget_min NUMERIC,
  budget_max NUMERIC,
  purchase_timeline TEXT,
  product_interest TEXT,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
AS $func$
BEGIN
  IF p_lead_id IS NULL THEN
    RAISE EXCEPTION 'p_lead_id is required';
  END IF;

  RETURN QUERY
  UPDATE public.leads l
  SET
    name = COALESCE(NULLIF(BTRIM(p_name), ''), l.name),
    phone = COALESCE(NULLIF(BTRIM(p_phone), ''), l.phone),
    email = COALESCE(NULLIF(BTRIM(p_email), ''), l.email),
    qualification_summary = COALESCE(NULLIF(BTRIM(p_qualification_summary), ''), l.qualification_summary),
    purchase_purpose = COALESCE(NULLIF(BTRIM(p_purchase_purpose), ''), l.purchase_purpose),
    budget_min = COALESCE(p_budget_min, l.budget_min),
    budget_max = COALESCE(p_budget_max, l.budget_max),
    purchase_timeline = COALESCE(NULLIF(BTRIM(p_purchase_timeline), ''), l.purchase_timeline),
    product_interest = COALESCE(NULLIF(BTRIM(p_product_interest), ''), l.product_interest),
    updated_at = NOW()
  WHERE l.id = p_lead_id
  RETURNING
    l.id,
    l.name,
    l.phone,
    l.email,
    l.qualification_summary,
    l.purchase_purpose,
    l.budget_min,
    l.budget_max,
    l.purchase_timeline,
    l.product_interest,
    l.updated_at;
END;
$func$;

CREATE OR REPLACE FUNCTION public.extract_text_to_user(p_raw TEXT)
RETURNS TEXT
LANGUAGE plpgsql
AS $func$
DECLARE
  j JSONB;
BEGIN
  IF p_raw IS NULL OR BTRIM(p_raw) = '' THEN
    RETURN p_raw;
  END IF;

  BEGIN
    j := p_raw::jsonb;
  EXCEPTION WHEN others THEN
    RETURN p_raw;
  END;

  IF jsonb_typeof(j) = 'object' AND (j ? 'text_to_user') THEN
    RETURN COALESCE(NULLIF(BTRIM(j->>'text_to_user'), ''), p_raw);
  END IF;

  IF jsonb_typeof(j) = 'array'
     AND jsonb_array_length(j) > 0
     AND (j->0 ? 'text_to_user') THEN
    RETURN COALESCE(NULLIF(BTRIM(j->0->>'text_to_user'), ''), p_raw);
  END IF;

  RETURN p_raw;
END;
$func$;

CREATE OR REPLACE FUNCTION public.normalize_messages_text_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $func$
BEGIN
  IF NEW.sent_by = 'ai' THEN
    NEW.text := public.extract_text_to_user(NEW.text);
  END IF;
  RETURN NEW;
END;
$func$;

CREATE OR REPLACE FUNCTION public.sanitize_chat_history_message()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $func$
DECLARE
  v_type TEXT;
  v_content TEXT;
  v_json JSONB;
  v_clean TEXT;
  v_marker CONSTANT TEXT := '---LEAD_PASSPORT_START---';
BEGIN
  v_type := NEW.message->>'type';
  v_content := COALESCE(NEW.message->>'content', '');

  IF v_type = 'tool' THEN
    RETURN NULL;
  END IF;

  IF v_type = 'human' THEN
    v_clean := BTRIM(SPLIT_PART(v_content, v_marker, 1), E' \n\r\t');

    IF v_clean IS NULL
       OR v_clean = ''
    THEN
      RETURN NULL;
    END IF;

    NEW.message := jsonb_build_object(
      'type', 'human',
      'content', v_clean
    );
    RETURN NEW;
  END IF;

  IF v_type = 'ai' THEN
    BEGIN
      v_json := v_content::jsonb;
      v_clean := COALESCE(v_json->>'reply_to_user', v_json->>'text_to_user', '');
    EXCEPTION WHEN others THEN
      v_clean := v_content;
    END;

    IF v_clean IS NULL
       OR BTRIM(v_clean) = ''
       OR v_clean LIKE 'Calling %'
       OR v_clean LIKE '[{%'
    THEN
      RETURN NULL;
    END IF;

    NEW.message := jsonb_build_object(
      'type', 'ai',
      'content', BTRIM(v_clean, E' \n\r\t')
    );
    RETURN NEW;
  END IF;

  RETURN NULL;
END;
$func$;

CREATE OR REPLACE FUNCTION public.get_clean_chat_history(
  p_session_id VARCHAR,
  p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
  message_id INTEGER,
  role TEXT,
  content TEXT
)
LANGUAGE plpgsql
AS $func$
DECLARE
  rec RECORD;
  v_content TEXT;
  v_json JSONB;
BEGIN
  FOR rec IN
    SELECT
      ch.id AS src_id,
      ch.message->>'type' AS src_type,
      ch.message->>'content' AS src_content
    FROM public.chat_history ch
    WHERE ch.session_id = p_session_id
      AND ch.message->>'type' IN ('human', 'ai')
    ORDER BY ch.id DESC
    LIMIT GREATEST(COALESCE(p_limit, 50), 1)
  LOOP
    IF rec.src_type = 'human' THEN
      message_id := rec.src_id;
      role := 'user';
      content := COALESCE(rec.src_content, '');
      RETURN NEXT;
    ELSIF rec.src_type = 'ai' THEN
      v_content := COALESCE(rec.src_content, '');
      BEGIN
        v_json := v_content::jsonb;
        content := COALESCE(v_json->>'reply_to_user', v_json->>'text_to_user', '');
      EXCEPTION WHEN others THEN
        content := v_content;
      END;

      IF content IS NOT NULL
         AND BTRIM(content) <> ''
         AND content NOT LIKE 'Calling %'
         AND content NOT LIKE '[{%'
      THEN
        message_id := rec.src_id;
        role := 'assistant';
        RETURN NEXT;
      END IF;
    END IF;
  END LOOP;

  RETURN;
END;
$func$;

------------------------------------------------------------
-- 3. KNOWLEDGE & PRODUCTS
------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.knowledge_rag (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL DEFAULT 'global',
  content TEXT NOT NULL,
  embedding vector(1536),
  fts tsvector GENERATED ALWAYS AS (to_tsvector('simple', content)) STORED,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.products_live (
  id BIGSERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'global',
  entity_id TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_name TEXT NOT NULL,
  sku TEXT,
  status TEXT,
  category TEXT,
  attributes_json JSONB,
  search_text TEXT,
  embedding vector(1536),
  price NUMERIC,
  old_price NUMERIC,
  currency TEXT,
  stock_qty INTEGER,
  delivery_note TEXT,
  updated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

------------------------------------------------------------
-- 4. CORE CRM / LEADS
------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.leads (
  id SERIAL PRIMARY KEY,
  external_primary_id TEXT UNIQUE,
  crm_contact_id TEXT,
  crm_deal_id TEXT,
  name TEXT,
  phone TEXT,
  email TEXT,
  username TEXT,
  company_name TEXT,
  source_channel TEXT,
  source_campaign TEXT,
  source_metadata JSONB,
  purchase_purpose TEXT,
  budget_min NUMERIC,
  budget_max NUMERIC,
  purchase_timeline TEXT,
  product_interest TEXT,
  lead_status TEXT DEFAULT 'new',
  current_route TEXT DEFAULT 'qualification',
  current_stage TEXT,
  active_workflow TEXT,
  lead_temperature TEXT DEFAULT 'unknown',
  needs_human BOOLEAN DEFAULT false,
  handoff_status TEXT DEFAULT 'not_requested',
  nurture_status TEXT DEFAULT 'inactive',
  recommended_next_step TEXT,
  qualification_summary TEXT,
  consultation_summary TEXT,
  last_inbound_at TIMESTAMPTZ,
  last_outbound_at TIMESTAMPTZ,
  last_status_changed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.channel_identities (
  id SERIAL PRIMARY KEY,
  lead_id INTEGER REFERENCES public.leads(id) ON DELETE CASCADE,
  channel TEXT NOT NULL,
  external_contact_id TEXT NOT NULL,
  external_conversation_id TEXT,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

------------------------------------------------------------
-- 5. COMMUNICATIONS
------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.conversations (
  id SERIAL PRIMARY KEY,
  lead_id INTEGER REFERENCES public.leads(id) ON DELETE CASCADE,
  channel TEXT,
  external_conversation_id TEXT,
  status TEXT DEFAULT 'active',
  started_at TIMESTAMPTZ,
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.messages (
  id SERIAL PRIMARY KEY,
  lead_id INTEGER REFERENCES public.leads(id) ON DELETE SET NULL,
  conversation_id INTEGER REFERENCES public.conversations(id) ON DELETE SET NULL,
  channel TEXT,
  direction TEXT,
  message_type TEXT,
  text TEXT,
  attachments_json JSONB,
  sent_by TEXT,
  source_workflow TEXT,
  external_message_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.chat_history (
  id SERIAL PRIMARY KEY,
  session_id VARCHAR NOT NULL,
  message JSONB NOT NULL
);

CREATE TABLE IF NOT EXISTS public.chat_history_raw_backup (
  id INTEGER,
  session_id VARCHAR,
  message JSONB
);

------------------------------------------------------------
-- 6. WORKFLOWS / HANDOFF / NURTURE
------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.workflow_runs (
  id SERIAL PRIMARY KEY,
  lead_id INTEGER REFERENCES public.leads(id) ON DELETE SET NULL,
  conversation_id INTEGER,
  workflow_name TEXT NOT NULL,
  trigger_type TEXT,
  status TEXT,
  input_payload_json JSONB,
  result_payload_json JSONB,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  finished_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.handoffs (
  id SERIAL PRIMARY KEY,
  lead_id INTEGER REFERENCES public.leads(id) ON DELETE CASCADE,
  conversation_id INTEGER,
  source_workflow TEXT,
  handoff_reason TEXT,
  summary TEXT,
  assigned_human TEXT,
  task_id TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.nurture_state (
  id SERIAL PRIMARY KEY,
  lead_id INTEGER REFERENCES public.leads(id) ON DELETE CASCADE UNIQUE,
  status TEXT DEFAULT 'inactive',
  scenario_type TEXT,
  reason TEXT,
  step_number INTEGER DEFAULT 0,
  max_steps INTEGER,
  last_touch_at TIMESTAMPTZ,
  next_touch_at TIMESTAMPTZ,
  last_message_id INTEGER,
  exit_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

------------------------------------------------------------
-- 7. EVENTS / ERRORS / DEDUP
------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.lead_events (
  id SERIAL PRIMARY KEY,
  lead_id INTEGER REFERENCES public.leads(id) ON DELETE SET NULL,
  conversation_id INTEGER,
  event_type TEXT,
  event_category TEXT,
  workflow_name TEXT,
  status TEXT,
  payload JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.error_logs (
  id SERIAL PRIMARY KEY,
  workflow_name TEXT,
  node_name TEXT,
  error_type TEXT,
  error_message TEXT,
  payload JSONB,
  lead_id INTEGER,
  conversation_id INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.processed_events (
  id SERIAL PRIMARY KEY,
  dedup_key TEXT NOT NULL UNIQUE,
  platform TEXT,
  channel TEXT,
  session_id TEXT,
  lead_id INTEGER,
  conversation_id INTEGER,
  message_id INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

------------------------------------------------------------
-- 7.1 DAILY KPI
------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.daily_kpi (
  id BIGSERIAL PRIMARY KEY,
  date DATE NOT NULL,
  metric_name TEXT NOT NULL,
  metric_value NUMERIC NOT NULL,
  segment TEXT DEFAULT 'all',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

------------------------------------------------------------
-- 8. INDEXES
------------------------------------------------------------
CREATE INDEX IF NOT EXISTS knowledge_rag_embedding_hnsw_idx
  ON public.knowledge_rag USING hnsw (embedding vector_cosine_ops);

CREATE INDEX IF NOT EXISTS knowledge_rag_fts_gin_idx
  ON public.knowledge_rag USING gin (fts);

CREATE INDEX IF NOT EXISTS knowledge_rag_tenant_id_idx
  ON public.knowledge_rag (tenant_id);

CREATE INDEX IF NOT EXISTS idx_products_live_tenant_id
  ON public.products_live (tenant_id);

CREATE INDEX IF NOT EXISTS idx_products_live_entity_id
  ON public.products_live (entity_id);

CREATE INDEX IF NOT EXISTS idx_products_live_sku
  ON public.products_live (sku);

CREATE INDEX IF NOT EXISTS idx_products_live_category
  ON public.products_live (category);

CREATE INDEX IF NOT EXISTS products_live_embedding_hnsw_idx
  ON public.products_live USING hnsw (embedding vector_cosine_ops);

CREATE UNIQUE INDEX IF NOT EXISTS ux_products_live_tenant_entity_sku
  ON public.products_live (tenant_id, entity_id, sku);

CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_external
  ON public.leads (external_primary_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_conversations_external
  ON public.conversations (external_conversation_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_messages_external
  ON public.messages (external_message_id);

CREATE INDEX IF NOT EXISTS idx_messages_conv
  ON public.messages (conversation_id);

CREATE INDEX IF NOT EXISTS idx_leads_route
  ON public.leads (lead_status, current_route);

CREATE INDEX IF NOT EXISTS idx_nurture_active
  ON public.nurture_state (next_touch_at)
  WHERE status = 'active';

CREATE UNIQUE INDEX IF NOT EXISTS ux_daily_kpi_date_metric_segment
  ON public.daily_kpi (date, metric_name, segment);

------------------------------------------------------------
-- 9. RAG FUNCTIONS
------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.hybrid_search(
  query_text TEXT,
  query_embedding vector(1536),
  match_count INT,
  tenant_filter TEXT
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  metadata JSONB,
  similarity FLOAT,
  tenant_id TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH vector_search AS (
    SELECT
      kr.id,
      kr.content,
      kr.metadata,
      kr.tenant_id,
      1 - (kr.embedding <=> query_embedding) AS sim
    FROM public.knowledge_rag kr
    WHERE kr.embedding IS NOT NULL
      AND (
        (tenant_filter IS NULL AND kr.tenant_id = 'global')
        OR (tenant_filter IS NOT NULL AND kr.tenant_id IN (tenant_filter, 'global'))
      )
    ORDER BY kr.embedding <=> query_embedding
    LIMIT match_count
  ),
  keyword_search AS (
    SELECT
      kr.id,
      kr.content,
      kr.metadata,
      kr.tenant_id,
      ts_rank(kr.fts, websearch_to_tsquery('simple', query_text)) AS sim
    FROM public.knowledge_rag kr
    WHERE (
        (tenant_filter IS NULL AND kr.tenant_id = 'global')
        OR (tenant_filter IS NOT NULL AND kr.tenant_id IN (tenant_filter, 'global'))
      )
      AND kr.fts @@ websearch_to_tsquery('simple', query_text)
    ORDER BY sim DESC
    LIMIT match_count
  )
  SELECT
    COALESCE(vs.id, ks.id) AS id,
    COALESCE(vs.content, ks.content) AS content,
    COALESCE(vs.metadata, ks.metadata) AS metadata,
    (COALESCE(vs.sim, 0) + COALESCE(ks.sim, 0)) AS similarity,
    COALESCE(vs.tenant_id, ks.tenant_id) AS tenant_id
  FROM vector_search vs
  FULL OUTER JOIN keyword_search ks ON vs.id = ks.id
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.match_knowledge_rag(
  query_embedding vector(1536),
  match_count INT,
  filter JSONB DEFAULT '{}'::jsonb
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  metadata JSONB,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
DECLARE
  tenant_filter TEXT;
BEGIN
  tenant_filter := filter->>'tenant_id';

  RETURN QUERY
  SELECT
    kb.id,
    kb.content,
    kb.metadata,
    1 - (kb.embedding <=> query_embedding) AS similarity
  FROM public.knowledge_rag kb
  WHERE kb.embedding IS NOT NULL
    AND (
      (tenant_filter IS NULL AND kb.tenant_id = 'global')
      OR (tenant_filter IS NOT NULL AND kb.tenant_id IN (tenant_filter, 'global'))
    )
  ORDER BY kb.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

------------------------------------------------------------
-- 10. TRIGGERS
------------------------------------------------------------
DROP TRIGGER IF EXISTS update_leads_updated_at ON public.leads;
CREATE TRIGGER update_leads_updated_at
BEFORE UPDATE ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_channel_identities_updated_at ON public.channel_identities;
CREATE TRIGGER update_channel_identities_updated_at
BEFORE UPDATE ON public.channel_identities
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_conversations_updated_at ON public.conversations;
CREATE TRIGGER update_conversations_updated_at
BEFORE UPDATE ON public.conversations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_messages_updated_at ON public.messages;
CREATE TRIGGER update_messages_updated_at
BEFORE UPDATE ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_handoffs_updated_at ON public.handoffs;
CREATE TRIGGER update_handoffs_updated_at
BEFORE UPDATE ON public.handoffs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_nurture_state_updated_at ON public.nurture_state;
CREATE TRIGGER update_nurture_state_updated_at
BEFORE UPDATE ON public.nurture_state
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_normalize_messages_text ON public.messages;
CREATE TRIGGER trg_normalize_messages_text
BEFORE INSERT OR UPDATE OF text, sent_by
ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.normalize_messages_text_trigger();

DROP TRIGGER IF EXISTS trg_sanitize_chat_history_message ON public.chat_history;
CREATE TRIGGER trg_sanitize_chat_history_message
BEFORE INSERT OR UPDATE ON public.chat_history
FOR EACH ROW
EXECUTE FUNCTION public.sanitize_chat_history_message();

COMMIT;
