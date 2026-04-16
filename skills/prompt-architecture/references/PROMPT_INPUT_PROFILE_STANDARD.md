# Prompt Input Profile Standard

Builder должен работать только по структурированному input profile.

## Required core fields

- `company_name`
- `company_type`
- `domain_type`
- `business_model`
- `agent_role`
- `rag_document_types`
- `live_tables`
- `primary_live_table`
- `routing_rules`
- `available_tools`
- `forbidden_actions`
- `output_contract`

## Additional fields for live/data-heavy roles

- `primary_entity_field`
- `primary_sku_field`
- `primary_category_field`
- `primary_attributes_field`
- `normalized_category_values`
- `normalized_attribute_keys`
- `normalized_attribute_values`
- `human_to_db_mapping`
- `live_search_rules`
- `fallback_policy`
- `handoff_rules`
- `state_rules`
- `crm_rules`
- `db_write_rules`

## Minimal viable profile

Если профиль неполный, builder может собрать только честный draft prompt.

При неполном профиле builder обязан:
- не выдумывать отсутствующие таблицы;
- не выдумывать CRM-поля;
- не выдумывать output contract;
- не выдумывать tool contract;
- явно сокращать или пропускать недоопределенные technical blocks.
