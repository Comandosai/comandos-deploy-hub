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
- `crm_enabled`
- `crm_type`
- `crm_write_enabled`
- `crm_exact_actions`

## Minimal viable profile

Если профиль неполный, builder может собрать только честный draft prompt.

При неполном профиле builder обязан:
- не выдумывать отсутствующие таблицы;
- не выдумывать CRM-поля;
- не выдумывать, включена ли CRM запись;
- не выдумывать тип CRM;
- не выдумывать exact CRM actions;
- не выдумывать output contract;
- не выдумывать tool contract;
- явно сокращать или пропускать недоопределенные technical blocks.

## CRM gating rule

Для ролей с CRM/DB integration builder обязан различать:
- CRM присутствует как система;
- CRM write реально разрешен;
- exact CRM actions подтверждены runtime/reference.

Если подтверждены только наличие CRM или ее тип, но не exact actions, builder обязан собирать prompt с явным `skip CRM`, а не с абстрактным CRM write behavior.
