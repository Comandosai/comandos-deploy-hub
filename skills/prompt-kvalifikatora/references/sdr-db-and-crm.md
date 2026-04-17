# DB и CRM для квалификатора

## Safe DB contract

`MCP Postgres` обязателен, когда проект хранит lead memory в Postgres.

Используй только:

`SELECT * FROM public.update_lead_profile_safe(...)`

Подтвержденные параметры:
- `p_lead_id`
- `p_name`
- `p_phone`
- `p_email`
- `p_qualification_summary`
- `p_qualification_score`
- `p_purchase_purpose`
- `p_budget_min`
- `p_budget_max`
- `p_purchase_timeline`
- `p_product_interest`

Правила использования:
- named params `p_... => ...`
- явные типы
- typed null для неизвестных значений
- явное упоминание `MCP Postgres` как DB tool в итоговом prompt
- последовательность `qualification_summary -> DB write-back -> confirmed CRM sync -> reply`

Никогда не выдумывай:
- `p_company`
- `p_position`
- `p_industry`
- `p_result_summary`
- любые product-attribute safe params

## CRM

Если CRM подтвержден, разрешай только точные действия из runtime/reference.

Не используй расплывчатые формулировки вроде:
- "sync with CRM"
- "update lead after every fact"

Не выдумывай:
- field IDs
- stage changes
- pipeline updates
- custom payload structure

Если `MCP Postgres` есть в project contract, но итоговый qualifier prompt не требует его явно для обновления lead-profile, такой prompt невалиден.
