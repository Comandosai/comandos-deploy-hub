---
name: Векторизация и загрузка базы
description: Разбирает сырые документы клиента, создает рабочий __workspace, формирует docs, product_memory и products_live, затем отправляет данные в COMANDOS runtime, получает чанки и embeddings и записывает результат в Supabase. Использовать, когда нужно быстро подготовить базу знаний и товарную таблицу для дальнейшей работы отдела продаж.
---

# Векторизация и загрузка базы

Use this skill as the localized entrypoint for the existing vector ingestion bundle.

It covers:
- document split;
- workspace preparation;
- products table generation;
- ingestion into COMANDOS runtime;
- writing knowledge chunks and product rows into Supabase.

## What to read first

1. Read [порядок работы](references/poryadok-raboty.md).
2. Read [обязательные условия](references/obyazatelnye-usloviya.md).
3. Read [команды для запуска](references/komandy-dlya-zapuska.md).

## Rules

- Keep names and user-facing explanations in Russian.
- The normal flow is:
  - source files -> `doc-splitter` -> `__workspace` -> runtime API -> `Supabase`
- Do not ask the user to run `node` manually in the normal flow.
- Use the bundled `doc-splitter` logic, not an unrelated external splitter.
- If `products_live` can be built from factual rows, build it in the same split pass.
- `registry_rows` are not part of the normal flow.
- The ingestion runner executes on the local execution host with internet access to `api.comandos.ai`.
- The `Supabase` server is the storage target, not the default execution host.

## Expected result

At the end of the flow:
- `__workspace` exists;
- normalized docs exist;
- `products_live` exists if the source contained factual product rows;
- runtime returns chunks and embeddings;
- data is written to `knowledge_rag`;
- product rows are written to `products_live`;
- a short summary is produced.
