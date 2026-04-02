---
name: doc-splitter
description: Split messy company source materials into normalized ingestion outputs for Google Docs and tables. Use when raw files need to be classified into RAG docs, live product rows, and brief updates; when documents must be prepared in markdown-style text for Google Docs; or when registry rows and products tables must be generated alongside the docs.
---

# Doc Splitter

## Overview

Use this skill to turn messy company materials into a clean ingestion package:
- Google Docs-ready markdown-style documents;
- optional product-memory docs for RAG browse guidance;
- a products table for live catalog rows;
- optional brief updates when requested.

Treat this skill as domain-neutral normalization:
- preserve real source categories and factual attributes;
- do not force manufacturing-specific keys onto non-manufacturing businesses;
- keep enough structure so later skills can infer a project-specific schema contract and a more universal search model.

This skill is only for document splitting and normalization. It does not build `sdr_qualifier` or `consultant` prompts.

When this skill produces `products_live`, it should also produce a retrieval-friendly semantic-search field per product row:
- `search_text`
- this field is built for later vector retrieval over the live product table
- this field is not decorative copy and not a raw dump of the whole row

## Workflow

1. Read the source files and classify content as `rag`, `live`, or `mixed`.
2. Split mixed material into:
- one or more RAG docs;
- zero or more `product_memory` docs when the catalog needs browse memory;
- separate `LIVE DATA ROWS`.
3. Build each future document as one complete markdown-style block:
- output only the document body itself, without filename lines, code fences, or service wrappers;
- document body starts from the first useful `##` block;
- no decorative H1, no `**Теги:**` line inside the document body, no empty grouping headers;
- no heading-only chunks;
- no weak wrapper-intro chunks that only say "below are questions/categories/examples" without standalone retrieval value;
- split by semantically useful sections, not by one giant umbrella file.
- do not use `---` as a structural separator between semantic sections; use real headings instead.
- if a section is too large, split it into smaller retrieval-friendly `##` or `###` blocks.
4. Prepare two parallel tabular outputs:
- `live product rows` for `products_live`.
4.1. When live product rows exist, include one explicit semantic-search field per row:
- `search_text`
- build it from product meaning, not from technical metadata
- optimize it for broad retrieval intents such as `сон`, `энергия`, `без приборов`, `мягкий старт`, `что попроще`
4.2. If the source clearly contains factual live product data, produce the `products_live` table immediately as part of the main skill output:
- do not stop at docs and then ask a follow-up question like `сделать ли еще таблицу`;
- do not invent a custom table schema from scratch;
- use the canonical `products_live` template directly.
4. If the source exposes reusable assortment structure, also prepare `product_memory` docs:
- derive them from live rows and supporting product docs;
- use them to capture category / series / mount-type / material / nearby-size logic for later RAG;
- keep them semantic, not transactional: no fake stock promises, no synthetic prices, no copied full catalog dumps.
5. Preserve domain meaning inside `attributes_json` instead of flattening or forcing one hard-coded business taxonomy.
5. If the user wants Google Docs, prepare documents as Google Docs content:
- keep markdown-style text inside the doc;
- do not convert structure into rich Doc headings unless explicitly requested.
- preserve literal `#`, `##`, and `###` characters in the document body as plain text;
- do not let the upload/import step convert markdown headings into native Google Docs heading styles by default, because downstream chunking may rely on literal `##` markers.

## Output Rules

Always separate layers:
- RAG docs -> document outputs;
- product-memory docs -> document outputs;
- live products -> `LIVE DATA ROWS`;
- brief -> only when the user explicitly asks for it.

For live products specifically:
- create the canonical live table in the same run when factual live rows are present;
- include a stable `search_text` column in the canonical live output;
- build `search_text` from semantic retrieval signals, not from transactional or technical metadata;
- prefer product name, category / format, problem tags, use-cases, criteria of choice, and nearby user wording;
- do not make price, stock, timestamps, or internal IDs the backbone of `search_text`.

Never:
- mix RAG text and live rows in one block;
- dump the whole live catalog into one giant memory doc;
- collapse live rows into simplified schemas;
- предлагать после основного запуска `сделать еще таблицу отдельно`, если source уже содержит factual live rows;
- строить самодельную продуктовую таблицу не по canonical `products_live` template;
- omit `search_text` when live rows are meant to support later semantic product retrieval;
- start a `product` document with a useless top-level intro chunk.
- rewrite domain-specific live facts into a manufacturing-only shape if the source belongs to cars, real estate, medicine, services, or another category.
- wrap the document body in fenced markdown/code blocks;
- print the filename inside the document body;
- keep the original H1 title as the first line of the final document body;
- keep a decorative `**Теги:**` line in the final body when those tags can live in metadata or later retrieval fields;
- keep empty parent headings that create junk embeddings with no content underneath;
- keep container headings that have no own text and would produce a chunk like just `Частые вопросы` or `Основные категории`;
- keep weak intro wrappers like `Ниже собраны типовые вопросы...` or `В этом разделе представлены...` as standalone document starts when the real useful content begins only in child sections;
- merge multiple semantically different document types into one giant file when they should be separate docs.
- создавать `registry_rows` как обязательный артефакт для нового `Supabase`-based ingestion flow.
- use `---` to separate reviews, snippets, or cases inside a retrieval doc.

## Naming Rules

Name files clearly by content type and entity, for example:
- `products_promshield.md`
- `product_memory_promshield_wall_enclosures.md`
- `faq_promshield.md`
- `comparison_promshield.md`
- `offer_promshield.md`
- `policy_promshield.md`
- `instruction_custom_request.md`

Prefer one broader file per content type over many tiny files when the material belongs together.
But do not force unrelated sections into one file if that creates mixed embeddings or empty heading fragments.
For objections and FAQs, prefer one clean file per content type or per major semantic group, not one file per single item.

For product/topic docs specifically:
- prefer an explicit product/entity name in the filename when source-faithful naming is available;
- avoid generic names like `Продукт 53.md` when the true product name can be recovered from source;
- use numeric fallback names only when no reliable title exists.

## Google Docs Rule

If the user wants Google Docs:
- create Google Docs, not raw `.md` files;
- keep the body in markdown-style plain text with `##` and lists;
- keep literal markdown heading markers in the saved Google Doc text;
- treat `##` markers as chunk boundaries for downstream ingestion when the project uses heading-based splitting;
- do not import docs in a way that converts `##` into visual Google Docs headings unless the user explicitly asks for presentation formatting instead of chunk-safe storage;
- prepare the live-products table separately.
- keep `product_memory` docs in the same Google Docs style when they are produced.

## Product section normalization

For product-style docs, normalize broad marketing blobs into retrieval-friendly sections.

If the source contains one huge section like `## Описание`, do not keep it as one giant block when it clearly contains multiple semantic intents.

Prefer splitting into normalized headings such as:
- `## Что это`
- `## Как работает`
- `## Что решает`
- `## Где применяется`
- `## Реальные результаты`
- `## Отзывы`
- `## Почему стоит попробовать`
- `## Важно`
- `## Для кого`

Use nearby source wording when available, but keep the section titles predictable and chunk-friendly.

If the source contains many raw reviews, case snippets, CTA tails, or broken link blocks:
- do not dump them into one `## Дополнительная информация и отзывы` blob;
- group them into a compact `## Отзывы` or `## Кейсы` section only when they add retrieval value;
- drop repetitive CTA tails, repeated `пишите нам`, duplicated service boilerplate, and broken link blocks unless the user explicitly wants a sales-copy archive.

If a review/case block is kept:
- give it a real heading;
- keep it compact;
- avoid long chains of same-pattern snippets in one file when they can be removed or split more cleanly.

## `registry_rows` status

`registry_rows` считать legacy-артефактом для старых Google Docs / n8n / Sheets-based сценариев.

Для нового runtime-контура:

- `registry_rows` по умолчанию не создавать;
- основным output считать:
  - `docs/`
  - optional `product_memory`
  - optional `LIVE DATA ROWS` для `products_live`
- `registry_rows` делать только если пользователь явно попросил старый Google/Sheets-compatible export.

## When to create `products_live`

`products_live` нужно создавать только тогда, когда в источнике реально есть достаточно фактических live-данных, например:

- точные product rows;
- SKU / артикулы;
- точные названия позиций;
- статус / наличие;
- цена / валюта;
- точные атрибуты;
- размеры / характеристики / варианты;
- другие source-faithful factual fields.

Не создавать `products_live`, если источник содержит только:

- обзорные продуктовые описания;
- сценарии использования;
- FAQ;
- policy;
- research digest;
- browse-memory;
- продуктовые категории без честных row-level factual records.

В таком случае нужно делать только:

- `product` docs;
- optional `product_memory` docs;
- без искусственного `products_live`.

Если же factual live rows есть, то делать нужно сразу:

- `docs/` для semantic слоя;
- `products_live` table по canonical template;
- без дополнительного вопроса пользователю, нужен ли еще отдельный self-invented table output.

## `search_text` rule for live products

When you produce `products_live`, each product row should already contain a normalized semantic-search text field.

Purpose:
- later ingestion can vectorize this field directly;
- consultant retrieval can use it for semantic shortlist before structured rerank;
- broad user intents should surface a nearby group of relevant products, not one arbitrary exact-name hit.

Good `search_text` usually includes:
- product name;
- normalized category / format;
- what the product is usually for;
- problem tags / use-cases from source;
- criteria for when this option is a natural fit;
- nearby user wording when clearly supported by source meaning.

Avoid making `search_text` out of:
- timestamps;
- internal IDs;
- raw JSON dumps;
- pure price/stock data;
- decorative marketing fluff with no retrieval value.

## Required References

Read these references as needed:
- `references/classification-rules.md`
- `references/output-format.md`
- `references/google-docs-and-tables.md`
- `references/product-memory.md` when the user needs catalog browse memory or nearby-size reasoning

## Test Source

For local testing with PromShield messy input, use:
- `/Users/artemlahtin/Documents/Cyber_OP/06_Sluzhebnye_fayly/TEST_MESSY_INPUT_PROMSHCHIT_ENGINEERING.md`
- `/Users/artemlahtin/Documents/Cyber_OP/06_Sluzhebnye_fayly/TEST_MESSY_INPUT_PROMSHCHIT_ENGINEERING.txt`
