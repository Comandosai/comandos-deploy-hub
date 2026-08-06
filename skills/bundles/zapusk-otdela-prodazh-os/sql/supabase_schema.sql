BEGIN;

CREATE SCHEMA IF NOT EXISTS sales_department;

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS vector;

CREATE OR REPLACE FUNCTION sales_department.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS sales_department.knowledge_rag (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL DEFAULT 'global',
  content TEXT NOT NULL,
  embedding vector(1536),
  fts tsvector GENERATED ALWAYS AS (to_tsvector('simple', content)) STORED,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sales_department.products_live (
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

CREATE TABLE IF NOT EXISTS sales_department.clients (
  id SERIAL PRIMARY KEY,
  display_name TEXT,
  primary_phone TEXT,
  primary_email TEXT,
  primary_telegram TEXT,
  crm_contact_id TEXT,
  company_name TEXT,
  profile_summary TEXT,
  important_facts JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_seen_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sales_department.client_identities (
  id SERIAL PRIMARY KEY,
  client_id INTEGER NOT NULL REFERENCES sales_department.clients(id) ON DELETE CASCADE,
  channel TEXT,
  identity_type TEXT NOT NULL,
  identity_value TEXT NOT NULL,
  normalized_value TEXT NOT NULL,
  confidence TEXT NOT NULL DEFAULT 'strong',
  source TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  first_seen_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (identity_type, normalized_value)
);

CREATE TABLE IF NOT EXISTS sales_department.leads (
  id SERIAL PRIMARY KEY,
  external_primary_id TEXT UNIQUE,
  client_id INTEGER REFERENCES sales_department.clients(id) ON DELETE SET NULL,
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
  qualification_status TEXT DEFAULT 'not_qualified',
  consultation_status TEXT DEFAULT 'not_consulted',
  current_route TEXT DEFAULT 'qualification',
  current_stage TEXT,
  active_workflow TEXT,
  lead_temperature TEXT DEFAULT 'unknown',
  needs_human BOOLEAN DEFAULT false,
  handoff_status TEXT DEFAULT 'not_requested',
  reply_mode TEXT DEFAULT 'ai',
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

ALTER TABLE sales_department.leads
  ADD COLUMN IF NOT EXISTS client_id INTEGER REFERENCES sales_department.clients(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS sales_department.channel_identities (
  id SERIAL PRIMARY KEY,
  lead_id INTEGER REFERENCES sales_department.leads(id) ON DELETE CASCADE,
  channel TEXT NOT NULL,
  external_contact_id TEXT NOT NULL,
  external_conversation_id TEXT,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (channel, external_contact_id)
);

CREATE TABLE IF NOT EXISTS sales_department.client_memory_events (
  id SERIAL PRIMARY KEY,
  client_id INTEGER NOT NULL REFERENCES sales_department.clients(id) ON DELETE CASCADE,
  lead_id INTEGER REFERENCES sales_department.leads(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL DEFAULT 'fact_candidate',
  visibility TEXT NOT NULL DEFAULT 'internal_only',
  source TEXT,
  summary TEXT NOT NULL,
  facts JSONB NOT NULL DEFAULT '{}'::jsonb,
  confidence TEXT NOT NULL DEFAULT 'candidate',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sales_department.conversations (
  id SERIAL PRIMARY KEY,
  lead_id INTEGER REFERENCES sales_department.leads(id) ON DELETE CASCADE,
  channel TEXT,
  external_conversation_id TEXT UNIQUE,
  status TEXT DEFAULT 'active',
  reply_mode TEXT DEFAULT 'ai',
  started_at TIMESTAMPTZ,
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sales_department.messages (
  id SERIAL PRIMARY KEY,
  lead_id INTEGER REFERENCES sales_department.leads(id) ON DELETE SET NULL,
  conversation_id INTEGER REFERENCES sales_department.conversations(id) ON DELETE SET NULL,
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

CREATE TABLE IF NOT EXISTS sales_department.chat_history (
  id SERIAL PRIMARY KEY,
  session_id VARCHAR NOT NULL,
  message JSONB NOT NULL
);

CREATE TABLE IF NOT EXISTS sales_department.chat_history_raw_backup (
  id INTEGER,
  session_id VARCHAR,
  message JSONB
);

CREATE TABLE IF NOT EXISTS sales_department.workflow_runs (
  id SERIAL PRIMARY KEY,
  lead_id INTEGER REFERENCES sales_department.leads(id) ON DELETE SET NULL,
  conversation_id INTEGER REFERENCES sales_department.conversations(id) ON DELETE SET NULL,
  workflow_name TEXT NOT NULL,
  trigger_type TEXT,
  status TEXT,
  input_payload_json JSONB,
  result_payload_json JSONB,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  finished_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS sales_department.handoffs (
  id SERIAL PRIMARY KEY,
  lead_id INTEGER REFERENCES sales_department.leads(id) ON DELETE CASCADE,
  conversation_id INTEGER REFERENCES sales_department.conversations(id) ON DELETE SET NULL,
  source_workflow TEXT,
  handoff_reason TEXT,
  contact_request_status TEXT DEFAULT 'needed',
  preferred_contact TEXT,
  preferred_contact_time TEXT,
  summary TEXT,
  assigned_human TEXT,
  task_id TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sales_department.nurture_state (
  id SERIAL PRIMARY KEY,
  lead_id INTEGER REFERENCES sales_department.leads(id) ON DELETE CASCADE UNIQUE,
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

CREATE TABLE IF NOT EXISTS sales_department.lead_events (
  id SERIAL PRIMARY KEY,
  lead_id INTEGER REFERENCES sales_department.leads(id) ON DELETE SET NULL,
  conversation_id INTEGER REFERENCES sales_department.conversations(id) ON DELETE SET NULL,
  event_type TEXT,
  event_category TEXT,
  workflow_name TEXT,
  status TEXT,
  payload JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sales_department.processed_events (
  id SERIAL PRIMARY KEY,
  dedup_key TEXT NOT NULL UNIQUE,
  platform TEXT,
  channel TEXT,
  session_id TEXT,
  lead_id INTEGER REFERENCES sales_department.leads(id) ON DELETE SET NULL,
  conversation_id INTEGER REFERENCES sales_department.conversations(id) ON DELETE SET NULL,
  message_id INTEGER REFERENCES sales_department.messages(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sales_department.daily_kpi (
  id BIGSERIAL PRIMARY KEY,
  date DATE NOT NULL,
  metric_name TEXT NOT NULL,
  metric_value NUMERIC NOT NULL,
  segment TEXT DEFAULT 'all',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (date, metric_name, segment)
);

ALTER TABLE sales_department.knowledge_rag
  ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT 'global';

ALTER TABLE sales_department.products_live
  ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT 'global';

CREATE INDEX IF NOT EXISTS sales_department_knowledge_rag_fts_gin_idx
  ON sales_department.knowledge_rag USING gin (fts);

CREATE INDEX IF NOT EXISTS sales_department_knowledge_rag_embedding_hnsw_idx
  ON sales_department.knowledge_rag USING hnsw (embedding vector_cosine_ops);

CREATE INDEX IF NOT EXISTS sales_department_knowledge_rag_tenant_id_idx
  ON sales_department.knowledge_rag (tenant_id);

CREATE INDEX IF NOT EXISTS sales_department_products_live_tenant_id_idx
  ON sales_department.products_live (tenant_id);

CREATE INDEX IF NOT EXISTS sales_department_products_live_entity_id_idx
  ON sales_department.products_live (entity_id);

CREATE INDEX IF NOT EXISTS sales_department_products_live_sku_idx
  ON sales_department.products_live (sku);

CREATE INDEX IF NOT EXISTS sales_department_products_live_category_idx
  ON sales_department.products_live (category);

CREATE INDEX IF NOT EXISTS sales_department_products_live_embedding_hnsw_idx
  ON sales_department.products_live USING hnsw (embedding vector_cosine_ops);

CREATE UNIQUE INDEX IF NOT EXISTS sales_department_products_live_entity_sku_idx
  ON sales_department.products_live (entity_id, sku);

CREATE UNIQUE INDEX IF NOT EXISTS sales_department_products_live_tenant_entity_sku_idx
  ON sales_department.products_live (tenant_id, entity_id, sku);

CREATE INDEX IF NOT EXISTS sales_department_clients_crm_contact_idx
  ON sales_department.clients (crm_contact_id);

CREATE INDEX IF NOT EXISTS sales_department_clients_phone_idx
  ON sales_department.clients (primary_phone);

CREATE INDEX IF NOT EXISTS sales_department_clients_email_idx
  ON sales_department.clients (primary_email);

CREATE INDEX IF NOT EXISTS sales_department_client_identities_client_idx
  ON sales_department.client_identities (client_id);

CREATE INDEX IF NOT EXISTS sales_department_client_identities_lookup_idx
  ON sales_department.client_identities (identity_type, normalized_value);

CREATE INDEX IF NOT EXISTS sales_department_client_memory_client_idx
  ON sales_department.client_memory_events (client_id, created_at DESC);

CREATE INDEX IF NOT EXISTS sales_department_leads_client_idx
  ON sales_department.leads (client_id);

CREATE INDEX IF NOT EXISTS sales_department_leads_route_idx
  ON sales_department.leads (lead_status, current_route);

CREATE INDEX IF NOT EXISTS sales_department_leads_reply_mode_idx
  ON sales_department.leads (reply_mode);

CREATE INDEX IF NOT EXISTS sales_department_conversations_lead_idx
  ON sales_department.conversations (lead_id);

CREATE INDEX IF NOT EXISTS sales_department_messages_conversation_idx
  ON sales_department.messages (conversation_id);

CREATE INDEX IF NOT EXISTS sales_department_messages_lead_created_idx
  ON sales_department.messages (lead_id, created_at DESC);

DROP INDEX IF EXISTS sales_department.sales_department_messages_external_idx;

CREATE UNIQUE INDEX IF NOT EXISTS sales_department_messages_external_conversation_idx
  ON sales_department.messages (channel, conversation_id, external_message_id)
  WHERE external_message_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS sales_department_workflow_runs_lead_idx
  ON sales_department.workflow_runs (lead_id, started_at DESC);

CREATE INDEX IF NOT EXISTS sales_department_lead_events_lead_idx
  ON sales_department.lead_events (lead_id, created_at DESC);

CREATE INDEX IF NOT EXISTS sales_department_nurture_active_idx
  ON sales_department.nurture_state (next_touch_at)
  WHERE status = 'active';

CREATE OR REPLACE FUNCTION sales_department.hybrid_search(
  query_text TEXT,
  query_embedding vector(1536),
  match_count INT,
  tenant_filter TEXT DEFAULT NULL
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
    FROM sales_department.knowledge_rag kr
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
    FROM sales_department.knowledge_rag kr
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

CREATE OR REPLACE FUNCTION sales_department.match_knowledge_rag(
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
  FROM sales_department.knowledge_rag kb
  WHERE kb.embedding IS NOT NULL
    AND (
      (tenant_filter IS NULL AND kb.tenant_id = 'global')
      OR (tenant_filter IS NOT NULL AND kb.tenant_id IN (tenant_filter, 'global'))
    )
  ORDER BY kb.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

DROP TRIGGER IF EXISTS leads_updated_at ON sales_department.leads;
CREATE TRIGGER leads_updated_at
BEFORE UPDATE ON sales_department.leads
FOR EACH ROW
EXECUTE FUNCTION sales_department.update_updated_at_column();

DROP TRIGGER IF EXISTS clients_updated_at ON sales_department.clients;
CREATE TRIGGER clients_updated_at
BEFORE UPDATE ON sales_department.clients
FOR EACH ROW
EXECUTE FUNCTION sales_department.update_updated_at_column();

DROP TRIGGER IF EXISTS client_identities_updated_at ON sales_department.client_identities;
CREATE TRIGGER client_identities_updated_at
BEFORE UPDATE ON sales_department.client_identities
FOR EACH ROW
EXECUTE FUNCTION sales_department.update_updated_at_column();

DROP TRIGGER IF EXISTS channel_identities_updated_at ON sales_department.channel_identities;
CREATE TRIGGER channel_identities_updated_at
BEFORE UPDATE ON sales_department.channel_identities
FOR EACH ROW
EXECUTE FUNCTION sales_department.update_updated_at_column();

DROP TRIGGER IF EXISTS conversations_updated_at ON sales_department.conversations;
CREATE TRIGGER conversations_updated_at
BEFORE UPDATE ON sales_department.conversations
FOR EACH ROW
EXECUTE FUNCTION sales_department.update_updated_at_column();

DROP TRIGGER IF EXISTS messages_updated_at ON sales_department.messages;
CREATE TRIGGER messages_updated_at
BEFORE UPDATE ON sales_department.messages
FOR EACH ROW
EXECUTE FUNCTION sales_department.update_updated_at_column();

DROP TRIGGER IF EXISTS handoffs_updated_at ON sales_department.handoffs;
CREATE TRIGGER handoffs_updated_at
BEFORE UPDATE ON sales_department.handoffs
FOR EACH ROW
EXECUTE FUNCTION sales_department.update_updated_at_column();

DROP TRIGGER IF EXISTS nurture_state_updated_at ON sales_department.nurture_state;
CREATE TRIGGER nurture_state_updated_at
BEFORE UPDATE ON sales_department.nurture_state
FOR EACH ROW
EXECUTE FUNCTION sales_department.update_updated_at_column();

COMMIT;
