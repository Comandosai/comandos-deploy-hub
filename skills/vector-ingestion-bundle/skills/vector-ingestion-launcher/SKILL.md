---
name: vector-ingestion-launcher
description: Launch the COMANDOS ingestion flow for a prepared workspace. Use this when the user already has `prepared/docs` and wants to send them to commandos-api, get chunks plus embeddings, and load the result into Supabase.
---

# Vector Ingestion Launcher

## What this launcher does

This launcher is a user-facing entrypoint for the ingestion stage.

Use it when the user says things like:

- `запусти ingestion flow`
- `загрузи документы в Supabase`
- `отправь prepared docs в API`
- `сделай chunks и embeddings`

## Required behavior

1. Reuse the existing `__workspace`.
2. Check whether `Supabase` access is already configured.
3. If not configured:
- ask only for the missing access data;
- if Supabase does not exist, ask for server access and deploy flow;
- if personal data is involved, require `RU server`.
4. Run the local runner as an internal step.
5. Send prepared docs to `commandos-api`.
6. Receive `chunks + embeddings`.
7. Write results to `Supabase`.

## Do not

- ask the user to manually run `node`;
- ask the user to manually compose payloads;
- move the user away from the current bundle runtime path.

## After finishing

Always report:

- how many docs were sent;
- how many chunks were received;
- how many rows were written to `knowledge_rag`;
- how many rows were written to `products_live`;
- whether any step failed.
