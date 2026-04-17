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
- Если в runtime/profile подтвержден `MCP Postgres` lead write-back path, итоговый prompt обязан содержать явный `Safe DB contract`.
- Нельзя выпускать prompt квалификатора, где есть инструмент `MCP Postgres`, но нет explicit логики записи в лид-профиль.
- Если используется safe lead-profile write-back, prompt обязан явно содержать:
  - `public.update_lead_profile_safe(...)`;
  - список разрешенных параметров;
  - sequencing `qualification_summary -> DB write-back -> confirmed CRM sync -> user-facing reply`;
  - правило, что `p_qualification_summary` обновляется при каждом meaningful new fact.
- Prompt обязан явно требовать summary write-back discipline: meaningful new facts должны отражаться в `p_qualification_summary`, если DB runtime доступен.
- Если этих правил нет в финальном prompt, сборка считается проваленной, а prompt — не production-ready.

## Обязательные references

Сначала прочитай:
- `references/sdr-role-contract.md`
- `references/sdr-db-and-crm.md`
- `../prompt-architecture/templates/SDR_QUALIFIER_SKELETON.md`
- `../prompt-architecture/references/PROMPT_BUILDER_CONTRACT.md`

## Выход

Навык должен вернуть и сохранить:
- один готовый системный промпт `sdr_qualifier`.

Перед завершением навык обязан проверить, что в итоговом prompt есть:
- explicit `Safe DB contract`;
- `public.update_lead_profile_safe(...)`;
- allowed params или project-safe DB contract;
- явная sequencing discipline;
- явное правило, что qualification write-back обязателен при meaningful new fact.

Если пользователь явно просит, рядом можно сохранить и input profile snapshot, но по умолчанию этот навык не должен пересобирать brief.
