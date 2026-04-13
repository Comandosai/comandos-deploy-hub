# Classification Rules

## Modes

- `rag` = semantic knowledge docs
- `live` = factual catalog rows
- `mixed` = both of the above in one source

## RAG content types

Use:
- `product`
- `product_memory`
- `faq`
- `script`
- `objection`
- `policy`
- `comparison`
- `offer`
- `instruction`
- `video`
- `doc` only if nothing more specific fits

## Product vs Live

`product`:
- category overview
- selection logic
- scenario explanations
- series differences
- meaningful grouped content that should live in one semantic document

`product_memory`:
- a browse-oriented memory layer derived from product docs and/or live rows;
- use for category / series / mount-type / nearby-size / material logic that should help the consultant orient before exact live lookup;
- keep it retrieval-friendly and compact: summarize size families, nearest-fit patterns, and major attribute combinations;
- do not treat it as authoritative stock, price, or availability;
- do not collapse the full catalog into one blob when there are natural families.

`objection`:
- objection materials should stay together in one objection-focused document or a small number of objection-focused docs;
- keep each objection block internally complete:
  - objection heading
  - what usually stands behind it
  - how to answer
  - example answer
- do not mix objection handling with FAQ, policy, script, or live rows in the same document.

`faq`:
- FAQ materials should stay together in one FAQ-focused document or a small number of FAQ-focused docs;
- keep each FAQ block internally complete as question + answer;
- do not mix FAQ with objections, policy, script, or live rows in the same document.

`comparison`:
- comparison materials should stay in one comparison-focused document or a small number of grouped comparison docs;
- use for side-by-side differences, trade-offs, option matrices, or "A vs B" selection help;
- do not hide comparison content inside generic `product` unless it is only a tiny supporting subsection.

`offer`:
- use for commercial offer structure, packaged proposals, bundled solutions, tariff/package descriptions, or proposal framing blocks;
- keep offer content separate from FAQ, policy, objections, and live rows unless the source is too thin to justify splitting.

`video`:
- use for transcript-derived semantic docs when the source is clearly a video, webinar, demo, walkthrough, or recorded explanation;
- keep transcript-like instructional or explanatory content separate from FAQ/policy/product docs when the source identity matters.

`live`:
- SKU
- price
- stock
- exact dimensions
- factual attributes

If a source contains both catalog facts and explanation, split it into:
- one `product` doc;
- optional `product_memory` docs when browse memory would materially help later retrieval;
- separate `LIVE DATA ROWS`.

If a source contains multiple semantically distinct explanation blocks, split them into separate docs when keeping them together would create:
- giant mixed-topic files;
- empty parent headings;
- weak embeddings with unrelated sections in one chunk.

Splitting rule for headings:
- keep a heading with its content when the heading has real standalone substance;
- if a heading is only a container label and immediately opens into subheadings, drop that empty parent heading and split by the useful child sections instead.
- if a heading would create a chunk containing only the heading text and no real body content, that heading must not appear in the final document body.
- if a heading has only a generic wrapper intro before child sections, and that intro does not add standalone factual meaning, drop the wrapper heading and intro together.

Examples of bad output:
- `## Частые вопросы` with no text of its own before child FAQ entries
- `## Частые вопросы` followed only by a generic intro like `Ниже собраны типовые вопросы...`
- `## Возражения` with no text of its own before child objection entries
- `## Основные категории продукции` followed only by deeper headings
- `## Материалы и базовая логика выбора` followed only by a generic bridge sentence before child blocks

Preferred behavior:
- begin directly from the first useful FAQ / objection / product subsection that actually contains content;
- keep semantic chunks dense, so each embedding contains the heading plus the real explanatory content that belongs to it.
- drop wrapper intros that do not answer anything, explain anything concrete, or carry standalone retrieval value.

Special rule for objection and FAQ files:
- if the raw source contains many FAQ or objection blocks of the same content type, group them into one clean type-specific file or a few major grouped files;
- do not create one file per single FAQ or per single objection by default;
- split further only when one file becomes too mixed, too large, or semantically incoherent for retrieval.

Special rule for product-memory files:
- use them when the live catalog has enough structure that a consultant should remember the assortment shape before exact search;
- default split unit is one stable browse family, for example same category, same series, or same mount type;
- each memory block should answer questions like:
  - what this family is for;
  - which sizes are typical or nearby;
  - which attributes commonly vary;
  - when to stay in the family versus move to a different family;
- avoid one-file-per-SKU by default;
- avoid one giant all-products file by default;
- if the assortment is small, one memory doc per category is acceptable;
- if the assortment is wide, prefer one memory doc per series or per category+mount-type family.

## Live normalization

Canonical live columns:

`tenant_id	entity_id	entity_type	entity_name	sku	status	category	attributes_json	price	currency	stock_qty	delivery_note	updated_at`

Rules:
- default `tenant_id = global`
- default `entity_type = product`
- do not invent `old_price`
- keep unknown nullable fields empty
- use real `attributes_json`, not fake flattened shortcuts like `dimensions` or `window: true`
- for `updated_at`, prefer a human-readable snapshot date in `DD.MM.YYYY` format when the source only gives a scrape/update date and exact time is not operationally important;
- do not write ISO timestamps like `2026-03-19T18:13:46.237456+00:00` into final user-facing live tables unless the project explicitly requires full timestamp precision.

Domain-neutral rules:
- keep `category` source-real unless the project already has a confirmed normalization layer;
- keep domain facts in `attributes_json` as they really appear in the source, even if the project later maps them to a cleaner search contract;
- do not force all businesses into manufacturing terms like `material`, `lock`, `window`, or `dimensions_mm` if the source is about cars, properties, services, medical offerings, or equipment with different attributes;
- when possible, preserve enough detail for later extraction of:
  - enum-like features
  - boolean features
  - numeric/range features
  - free-text features

The goal of `doc-splitter` is not to finalize one universal live schema.
Its goal is to produce factual live rows that are honest enough for later skills to derive:
- project live schema contract
- project value contract
- broader search and handoff contracts
