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
