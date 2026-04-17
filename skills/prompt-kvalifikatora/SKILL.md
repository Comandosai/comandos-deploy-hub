---
name: Промпт квалификатора
description: Собирает только системный промпт `sdr_qualifier` из готового брифа и Prompt Input Profile. Использовать, когда нужен production-ready промпт для квалификации без product lookup и без consultant-style поведения.
---

# Промпт квалификатора

## Обзор

Этот навык собирает только `sdr_qualifier`.

Он role-isolated:
- строит только `sdr_qualifier`;
- не строит `consultant`;
- не добавляет product-selection logic;
- не тянет consultant-style browse behavior.

## Workflow

1. Прочитай готовый `brief`.
2. Прочитай готовый `Prompt Input Profile`.
3. Прочитай canonical skeleton и contract-файлы.
4. Собери только системный промпт `sdr_qualifier`.
5. Сохрани итоговый промпт как отдельный артефакт.

## Hard Rules

- Используй только `sdr_qualifier`, а не `interviewer`.
- Сохраняй fixed JSON output.
- Используй только confirmed safe DB write contract.
- Разрешай CRM actions только если они явно подтверждены в profile / runtime contract.
- Не разрешай `products_live` lookup, `exact_match`, `relaxed_match` или `category_browse`.
- Не проваливайся в plain text, если downstream ожидает fixed JSON.

## Обязательные references

Сначала прочитай:
- `references/sdr-role-contract.md`
- `references/sdr-db-and-crm.md`
- `../prompt-architecture/templates/SDR_QUALIFIER_SKELETON.md`
- `../prompt-architecture/references/PROMPT_BUILDER_CONTRACT.md`

## Выход

Навык должен вернуть и сохранить:
- один готовый системный промпт `sdr_qualifier`.

Если пользователь явно просит, рядом можно сохранить и input profile snapshot, но по умолчанию этот навык не должен пересобирать brief.
