# DB и CRM для квалификатора

## Safe DB contract

`MCP Postgres` is mandatory when the project stores lead memory in Postgres.

Use only:

`SELECT * FROM public.update_lead_profile_safe(...)`

Confirmed params:
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

Use:
- named params `p_... => ...`
- explicit types
- typed null for unknown values
- explicit reference to `MCP Postgres` as the DB tool in the generated prompt
- sequencing `qualification_summary -> DB write-back -> confirmed CRM sync -> reply`

Never invent:
- `p_company`
- `p_position`
- `p_industry`
- `p_result_summary`
- any product-attribute safe params

## CRM

If CRM is confirmed, allow only exact actions from runtime/reference.

Do not use broad phrases like:
- "sync with CRM"
- "update lead after every fact"

Do not invent:
- field IDs
- stage changes
- pipeline updates
- custom payload structure

If `MCP Postgres` exists in the project contract but the generated qualifier prompt does not explicitly require using it for lead-profile updates, that prompt is invalid.
