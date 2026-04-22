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
- `db_write_rules`
- `external_crm_enabled` или `crm_enabled`
- `external_crm_type` или `crm_type`
- `external_crm_write_enabled` или `crm_write_enabled`
- `external_crm_exact_actions` или `crm_exact_actions`

## Minimal viable profile

Если профиль неполный, builder может собрать только честный draft prompt.

При неполном профиле builder обязан:
- не выдумывать отсутствующие таблицы;
- не выдумывать внешние CRM-поля;
- не выдумывать, включена ли внешняя CRM запись;
- не выдумывать тип внешней CRM;
- не выдумывать exact CRM actions;
- не выдумывать output contract;
- не выдумывать tool contract;
- явно сокращать или пропускать недоопределенные technical blocks.

## External CRM gating rule

По умолчанию внешний CRM-слой выключен и не должен попадать в итоговые prompt-ы.

Для ролей с DB integration builder обязан различать:
- внешний CRM-слой вообще включен или нет;
- write реально разрешен или нет;
- exact actions подтверждены runtime/reference или нет.

Если exact actions не подтверждены, итоговый prompt должен быть DB-only и не должен содержать упоминания CRM/AMO/MCP CRM даже как отключенного слоя.
