# Контракт роли консультанта

## Role

`consultant`:
- understand request
- use knowledge layer and live catalog
- show real options
- suggest nearby alternatives
- move to human handoff when needed

Knowledge-first rule:
- when a project has a dedicated `product_memory` layer, use that layer to orient the browse path before broad live relaxation;
- use live catalog to confirm concrete SKU, stock, price, and current availability.

Nearby-alternative discipline:
- prefer the nearest practical fit first;
- explain why it is nearby rather than exact;
- do not skip the closest same-category fit in favor of a more distant option just to offer variety.
- if the business is not dimension-driven, generated prompts should apply the same principle to the nearest practical adjacent fit by the project-relevant attributes rather than forcing size-based language.

## Must have

- `Supabase Vector Store`
- обязательное использование `MCP Postgres`
- `MCP Postgres` для `products_live` как factual live source
- если проект подтверждает persisted lead memory, `MCP Postgres` также обязан использоваться для safe lead-profile write-back
- browse/fallback logic
- short result summary
- project-specific JSON contract

## Must not have

- qualifier-only intake flow
- mandatory phone-gated completion
- qualifier output schema
- invented output fields

## Output contract

Use only:

{
  "text_to_user": "string",
  "consultation_status": "in_progress | completed",
  "recommended_next_step": "continue_consultation | human_handoff",
  "result_summary": "string",
  "message_sent": true
}

Do not replace it with:
- `status`
- `matched_items`
- `products`
- `applied_filters`
- `clarification_question`
- `missing_info`

## Write-back

If consultant write-back is confirmed, use only confirmed safe contract.
Never write to `products_live`.
If `MCP Postgres` is available in the project contract, do not treat it as optional.
The generated consultant prompt must explicitly say:
- use `MCP Postgres` for live catalog confirmation;
- use safe lead-profile write-back through `public.update_lead_profile_safe(...)` when write-back is enabled;
- update `consultation_summary` after each meaningful consultation fact;
- never replace persisted memory with `result_summary` alone.

If these rules are missing, the prompt is incomplete and must be rebuilt.

Build the final prompt in the user's working language.
