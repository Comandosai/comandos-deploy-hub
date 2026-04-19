# Структура брифа

## Purpose

`Brief` — это технический source of truth для последующей сборки системных промптов, routing rules и live-search behavior.

## Что должно быть внутри

- `Business type`
- `Domain`
- `Geography`
- `Main products`
- `Production / delivery model`
- `Materials`
- `Typical requests`
- `Business constraints`
- `RAG documents`
- `Live tables`
- `Live Data Schema Contract`
- `Live Value Contract`
- `Catalog Browse Contract`
- `Search attributes`
- `AI roles planned`

## Правила

- делай бриф компактным;
- делай его техническим;
- убирай повторения;
- не превращай его в company presentation.

## Важно

Если live schema известна:
- сделай `attributes_json` явным;
- добавь canonical category values;
- добавь canonical attribute keys и values.

Если live rows показывают реальную browse-логику:
- обязательно добавь `Catalog Browse Contract`.
