# Output Format

## RAG doc output

For each doc output:
1. output the clean document body only
2. do not include filename lines inside the body
3. do not include fenced code blocks around the body
4. do not force legacy registry TSV rows unless the user explicitly asks for old Google/Sheets export compatibility

## Product doc rule

A `product` doc must:
- start from the first useful `##` block
- avoid decorative H1 intro
- avoid keeping `**Теги:**` as a body line when it is only auxiliary metadata
- avoid empty grouping headers like `## Основные категории`
- avoid parent headings that are followed only by child headings and no own content
- avoid mixing FAQ/script/policy/live content into the same document just because it appeared in one raw source
- be clean enough for embeddings: no filename label, no code fences, no service annotations
- never produce a chunk that is only a naked heading without its own explanatory text
- never start from a weak wrapper section whose only body is a generic intro sentence with no standalone factual or retrieval value
- never use `---` as the main structural boundary between semantic parts of the document
- never keep one giant `## Описание` block if it obviously contains multiple semantic sections

Preferred normalization for product docs:
- split broad product blobs into stable retrieval-friendly sections such as:
  - `## Что это`
  - `## Как работает`
  - `## Что решает`
  - `## Где применяется`
  - `## Реальные результаты`
  - `## Отзывы`
  - `## Почему стоит попробовать`
  - `## Важно`
  - `## Для кого`
- use `###` subsections when one `##` section is still too large
- keep sections small enough that one chunk maps to one user intent
- drop repeated CTA tails, broken link blocks, and duplicated service boilerplate unless explicitly requested

Filename rule for product docs:
- prefer explicit product/entity names in filenames
- avoid generic names like `Продукт 53.md` when the source gives a real title
- use fallback numeric names only when no reliable product title can be recovered

## Product-memory doc rule

A `product_memory` doc must:
- stay semantic and retrieval-friendly, not transactional;
- group one natural browse family per file or per major section, for example one category, one series, or one mount-type family;
- start from the first useful `##` block;
- include compact browse facts such as:
  - what the family is for;
  - typical dimensions or size ladder;
  - common material / lock / door / coating patterns;
  - nearest-fit guidance when an exact size is missing;
- keep literal markdown-style headings and lists for later chunking;
- avoid raw SKU dumps, full price lists, and copied stock tables;
- avoid vague text like "there are many options" without concrete browse value.

Preferred chunking for `product_memory`:
- split by stable family, not by arbitrary token count alone;
- keep one chunk around one `##` section when that section is internally complete;
- if a section becomes too large, split by `###` subfamily or by dimension family;
- prefer chunks that preserve the heading plus the nearby-size logic together;
- do not produce one chunk that mixes unrelated wall, floor, and panel families unless the assortment is truly tiny.

## Objection / FAQ granularity rule

For `objection` docs:
- default to one objection-focused file, or a small number of grouped objection files if the source is large;
- keep each objection block internally complete;
- do not split into one file per objection by default;
- split only if the objection collection becomes too large or retrieval quality clearly suffers.

For `faq` docs:
- default to one FAQ-focused file, or a small number of grouped FAQ files if the source is large;
- keep each question-answer block internally complete;
- do not split into one file per FAQ by default;
- split only if the FAQ collection becomes too large or retrieval quality clearly suffers.

Heading usefulness rule:
- keep a heading only if it has its own meaningful paragraph/list/table text before the next child section;
- if a heading is only a container for child subsections, drop that heading from the final body;
- start the document from the first heading that leads directly into meaningful content, not from an empty wrapper section.
- if the text under a heading is only boilerplate like "below are typical questions/categories/examples", treat that heading as a wrapper and start from the first useful child subsection instead.
- if the body after a heading is actually a mixed bag of description, use-cases, reviews, and CTA, split it into several real headings instead of keeping one overloaded section.

## Registry rows status

`registry_rows` are now considered a legacy export layer.

For the new `Supabase`-based runtime flow:

- do not emit `registry_rows` by default;
- treat `docs/` as the source of truth for knowledge ingestion;
- emit legacy registry TSV rows only when the user explicitly asks for Google/Sheets/n8n backward compatibility.

## Live rows output

If live products exist:
- print `LIVE DATA ROWS`
- then raw TSV rows only, not markdown table and not wrapped into the document body
- emit the canonical `products_live` table in the same main run
- do not require a second user prompt to generate the table
- do not invent a custom live-table schema outside the canonical template

If factual live products do not exist:

- do not invent `LIVE DATA ROWS`;
- do not convert broad category/product docs into fake live rows;
- keep the output in semantic doc form only.

Live rows must stay factual and source-faithful:
- do not pre-bake consultant search logic into the rows;
- do not rewrite category values just to make prompt generation easier;
- do not throw away attributes that may later matter for browse, relaxation, qualification, or handoff logic.
- include a dedicated `search_text` field for later semantic retrieval over live products;
- make `search_text` a normalized search representation, not a raw full-row dump;
- build `search_text` from product meaning: name, category / format, use-cases, problem tags, fit criteria, and nearby user wording when justified by source;
- do not make `search_text` mainly out of price, stock, timestamps, internal IDs, or raw JSON.
- when filling `updated_at` for Sheets or handoff tables, use `DD.MM.YYYY` by default rather than an ISO datetime, unless the user or project explicitly asks for full timestamp precision.

Canonical live schema:

`tenant_id	entity_id	entity_type	entity_name	sku	status	category	attributes_json	search_text	price	currency	stock_qty	delivery_note	updated_at`

Do not:
- output legacy registry rows as plain paragraph text
- output live rows as markdown table
- output a self-invented ad hoc products table instead of the canonical schema
- shorten live schema
- place registry rows or live rows inside a document body that is meant for embeddings
- create one-line or heading-only embedding chunks from empty wrapper headings
- create standalone chunks from weak wrapper intros with no real semantic value for retrieval
- keep review/case tails in docs as long `---`-separated chains without real headings
