---
name: vector-ingestion-launcher
description: Launch the COMANDOS ingestion flow for a prepared workspace. Use this when the user already has `Base/prepared_docs` and wants to send them to commandos-api, get chunks plus embeddings, and load the result into Supabase.
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

1. Reuse the existing `Base`.
2. Refuse to treat plain source files or a bare `bd/` folder as ingestion-ready if `Base/prepared_docs` does not exist yet.
3. Check whether `Supabase` access is already configured.
4. If not configured:
- ask only for the missing access data;
- if Supabase does not exist, ask for server access and deploy flow via `supabase-stack` from this repository;
- if personal data is involved, require `RU server`.
5. Run the local runner as an internal step on the local execution host.
6. Send prepared docs to `commandos-api`.
7. Receive `chunks + embeddings`.
8. Write results to remote `Supabase`.
9. After a successful run, ensure processed files leave `Base/prepared_docs` and appear in `Base/vectorized_docs`.

## Execution rule

- The default execution host is the local machine where the agent can access source files and outbound internet.
- The `Supabase` server is the database target, not the default place where ingestion should run.
- Do not move the ingestion step onto the `Supabase` server just because the database lives there.
- If the DB-reachable host cannot reach `api.comandos.ai`, switch to hybrid mode:
  - fetch runtime JSON on an internet-reachable host;
  - then import that JSON into `Supabase`.

## Canonical Supabase deploy path

- If a new database environment must be deployed, use the repository's canonical installer:
  - `https://github.com/Comandosai/comandos-deploy-hub/tree/main/supabase-stack`
- Treat `supabase-stack` as the default and expected deployment path for this bundle.
- Do not replace this with a plain `Postgres` or ad hoc `pgvector` container unless the user explicitly asks for a non-standard temporary test setup.
- For the normal client flow, the target is `Supabase`, not "any Postgres with pgvector".

## Do not

- ask the user to manually run `node`;
- ask the user to manually compose payloads;
- move the user away from the current bundle runtime path.
- silently substitute `Supabase` with a plain `Postgres`/`pgvector` deployment in the standard flow.
- leave successfully vectorized files sitting in `Base/prepared_docs`.

## After finishing

Always report:

- how many docs were sent;
- how many chunks were received;
- how many rows were written to `knowledge_rag`;
- how many rows were written to `products_live`;
- how many files were moved to `Base/vectorized_docs`;
- whether `Base/prepared_docs` was cleaned after the run;
- whether any step failed.
