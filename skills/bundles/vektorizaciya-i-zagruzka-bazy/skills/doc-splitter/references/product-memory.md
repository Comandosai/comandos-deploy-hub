# Product Memory

## Purpose

`product_memory` is an extra RAG layer for browse-oriented catalog memory.

Use it when later assistants should be able to answer:
- which family is probably relevant;
- what sizes are typical or nearby;
- which attributes usually vary inside the family;
- what the closest same-family fallback is before broadening to another category.

It is not a replacement for live lookup.
It should help the model orient before exact search and before relaxed search broadens too far.

## What to include

Include only stable, reusable browse facts such as:
- category and family purpose;
- series-to-use-case mapping;
- mount type;
- common material / lock / door / coating combinations;
- size ladders, dimension families, or representative nearby-size patterns;
- rules for when to stay in the same family and when to switch families.

## What not to include

Do not include:
- exhaustive SKU dumps;
- copied stock counts for every item;
- copied price tables;
- speculative availability promises;
- fake "all possible nearby sizes" invented from patterns that are not in the source.

## Derivation rule

Build `product_memory` from real source material:
- product docs;
- comparison docs;
- live product rows;
- other catalog explanations.

When live rows are used:
- abstract them into stable browse knowledge;
- do not expose temporary stock as if it were timeless memory;
- do not turn one-off assortment accidents into hard rules unless the source supports that pattern.

## Universal splitting rule

Default split unit:
- one category;
- or one series;
- or one category + mount-type family.

Use the smallest unit that keeps nearby-size logic coherent.

Good split examples:
- wall enclosures family;
- PBX family;
- floor cabinets family;
- stainless outdoor variants.

Bad split examples:
- all products in one file;
- one file per SKU by default;
- one chunk containing both wall and floor products with no shared browse logic.

## Suggested section shape

Prefer sections like:
- `## What this family is for`
- `## Typical size ladder`
- `## Common attribute patterns`
- `## Nearby-size fallback logic`
- `## When to switch to another family`

The exact headings may vary by domain.

## Relation to live search

`product_memory` should help later prompts decide:
- which category to search first;
- which family to prefer;
- which dimension or secondary attribute to soften first;
- which nearby alternative is genuinely close.

Then the live layer should confirm:
- exact SKU;
- current stock;
- price;
- current delivery note;
- current status.
