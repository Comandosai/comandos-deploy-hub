# Структура Prompt Input Profile

## Purpose

`Prompt Input Profile` — это структурированная машинная версия брифа для навыков генерации промптов.

## Обязательные секции

- `company_name`
- `company_type`
- `domain_type`
- `business_model`
- `agent_role`
- `uses_rag`
- `rag_document_types`
- `uses_live_postgres`
- `lead_db_enabled`
- `lead_db_write_function`
- `primary_live_table`
- `crm_enabled`
- `crm_type`
- `crm_write_enabled`
- `normalized_category_values`
- `normalized_attribute_keys`
- `human_to_db_mapping`
- `routing_rules`
- `live_search_rules`
- `available_tools`
- `forbidden_actions`
- `output_contract`

## Rules

- не выдумывай отсутствующие технические контракты;
- если CRM неясна, оставляй это явно как unclear / absent;
- если live schema известна, profile обязан отражать именно реальный контракт;
- если catalog browse logic известна, включай её в:
  - `catalog_browse_contract`
  - `primary_constraints`
  - `secondary_constraints`
  - `relaxation_order`
  - `browse_output_pattern`
  - `clarification_prompts`

## Output discipline

`Brief` и `Prompt Input Profile` — это разные артефакты.
Не сливай их в один общий blob.
