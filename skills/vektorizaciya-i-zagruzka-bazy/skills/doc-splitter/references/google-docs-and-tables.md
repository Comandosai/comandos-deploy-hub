# Google Docs And Tables

## Google Docs mode

When the user wants docs in Google Docs:
- create Google Docs, not Drive markdown files
- keep body text in markdown-style plain text
- preserve `##` headings and lists as text structure
- preserve literal `#`, `##`, and `###` characters in the Google Doc body
- assume downstream chunking may split on literal `##`, so the document text must retain those markers
- prefer insertion/import methods that keep markdown markers as plain text instead of converting them into native Google Docs heading formatting

Do not:
- rewrite content into decorative Doc titles
- inject extra intro headings just because the file is a Google Doc
- do not convert markdown headings into visual Google Docs heading styles by default if the project uses heading-based chunking

## Two-table rule

Prepare two separate tables:

### 1. Vector-base registry table

Contains one row per RAG doc:
- file name
- source link
- doc id
- project id
- content type
- object name
- status

This includes `product_memory` docs when they are produced.

### 2. Products live table

Contains product rows only in canonical live schema:

`tenant_id	entity_id	entity_type	entity_name	sku	status	category	attributes_json	search_text	price	currency	stock_qty	delivery_note	updated_at`

`search_text` is a required semantic-search field for later vector retrieval over `products_live`.

Build `search_text` from:
- product name
- normalized category / format
- problem tags / use-cases
- criteria of choice / natural fit signals
- nearby user wording when supported by source meaning

Do not build `search_text` primarily from:
- timestamps
- internal IDs
- pure stock / price fields
- raw JSON dumps

## Important separation

Docs and tables are related but different outputs:
- Google Docs hold semantic content
- registry rows index those docs
- products table stores factual catalog data
- product-memory docs sit on the semantic side, not in the live table

Never merge these layers into one universal table.
