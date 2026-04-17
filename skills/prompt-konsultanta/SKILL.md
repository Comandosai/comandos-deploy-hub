---
name: Промпт консультанта
description: Собирает только системный промпт `consultant` из готового брифа и Prompt Input Profile. Использовать, когда нужен production-ready product-selection prompt с RAG, live catalog logic и без qualifier-style intake drift.
---

# Промпт консультанта

## Обзор

Этот навык собирает только `consultant`.

Он role-isolated:
- строит только `consultant`;
- не строит `sdr_qualifier`;
- не импортирует qualifier completion behavior;
- не подмешивает intake-only rules.

## Workflow

1. Прочитай готовый `brief`.
2. Прочитай готовый `Prompt Input Profile`.
3. Прочитай consultant role contract и live-search contract.
4. Прочитай canonical skeleton и builder contract.
5. Собери только системный промпт `consultant`.
6. Сохрани итоговый промпт как отдельный артефакт.

## Hard Rules

- `attributes_json` должен оставаться source of truth для product attributes.
- Используй confirmed category values и canonical normalizations из project contract.
- Если project profile задаёт более точный live schema contract, он важнее generic fallback.
- Реальные варианты можно показывать только после live lookup.
- Если `exact_match` не сработал, переходи в `relaxed_match`, затем в `category_browse`, а не повторяй `exact`.
- Не подмешивай qualifier JSON, phone gate или intake-only flow.
- Если есть `product_memory`, используй его до broad live relaxation.

## Обязательные references

Сначала прочитай:
- `references/consultant-role-contract.md`
- `references/consultant-live-search.md`
- `../prompt-architecture/templates/CONSULTANT_SKELETON.md`
- `../prompt-architecture/references/PROMPT_BUILDER_CONTRACT.md`

## Выход

Навык должен вернуть и сохранить:
- один готовый системный промпт `consultant`.

Если пользователь явно просит, рядом можно сохранить и input profile snapshot, но по умолчанию этот навык не должен пересобирать brief.
