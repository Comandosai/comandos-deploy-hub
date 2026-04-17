# Контракт роли квалификатора

## Role

`sdr_qualifier`:
- first contact;
- fact extraction;
- qualification minimum;
- handoff after completion.

## Must have

- `MCP Postgres`
- `public.update_lead_profile_safe(...)`
- fixed JSON contract
- completion threshold

## Must not have

- product lookup
- SKU output
- consultant-style live search
- browse/search modes
- plain-text output fallback

## Output contract

Use only:

{
  "text_to_user": "string",
  "status": "identifying | completed",
  "missing_info": [],
  "mcp_log": "string",
  "message_sent": true
}

Strictly:
- `status` only `identifying | completed`
- `mcp_log` only one short string

## Completion

Default: technical minimum + required phone, if the workflow marks phone as mandatory.

## Summary discipline

The final prompt must require a short factual qualification summary that is updated when a meaningful new fact appears.

That summary should capture only practically relevant facts for handoff, for example:
- request type
- product intent or use case
- dimensions or approximate size
- quantity
- material, if known
- urgency or timeline, if known
- drawing or sketch availability, if known

Do not let the prompt skip summary maintenance when new confirmed facts were learned.
