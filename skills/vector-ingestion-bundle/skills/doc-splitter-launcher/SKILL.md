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
3. Run the bundled document splitting logic from:
- `../doc-splitter/SKILL.md`
- and use its bundled `references/` files, not an external or globally installed variant.
4. Produce:
- `docs/`
- optional `product_memory`
- canonical `products_live` only if factual live rows really exist
5. Keep the output limited to the current bundle artifacts.
6. Do not offer a separate ad hoc table after the main run.

## Important implementation rule

Do not treat document preparation as a light copy or a mild markdown cleanup.

The bundled `doc-splitter` must perform real structural normalization, including:
- remove decorative H1 from final document body;
- remove `**Теги:**` from final document body;
- start from the first useful `##` block;
- avoid one giant `## Описание` blob when it contains multiple semantic sections;
- avoid `---` as a structural separator;
- normalize product docs into retrieval-friendly sections when source semantics allow it.

## After finishing

Always report:

- which docs were created;
- whether `products_live` was created;
- if `products_live` was not created, why.

Then suggest the next step:

- `Запустить ingestion flow`
