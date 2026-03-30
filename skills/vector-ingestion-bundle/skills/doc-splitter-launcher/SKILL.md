---
name: doc-splitter-launcher
description: Launch the document splitting stage for the COMANDOS bundle. Use this when the user has a folder of raw source files and wants one clean `__workspace` with `docs`, optional `product_memory`, and canonical `products_live` when factual live rows exist.
---

# Doc Splitter Launcher

## What this launcher does

This launcher is a user-facing entrypoint for the document preparation stage.

Use it when the user says things like:

- `раздели документы`
- `подготовь workspace`
- `запусти doc splitter`
- `собери docs и products_live`

## Required behavior

1. Ask only for the source folder path if it is not already known.
2. Create or update one `__workspace`.
3. Run the document splitting logic.
4. Produce:
- `docs/`
- optional `product_memory`
- canonical `products_live` only if factual live rows really exist
5. Do not produce `registry_rows` unless the user explicitly asks for legacy Google/Sheets compatibility.
6. Do not offer a separate ad hoc table after the main run.

## After finishing

Always report:

- which docs were created;
- whether `products_live` was created;
- if `products_live` was not created, why.

Then suggest the next step:

- `Запустить ingestion flow`
