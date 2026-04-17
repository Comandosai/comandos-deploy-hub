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
3. Прочитай canonical skeleton, mature baseline и contract-файлы.
4. Собери только системный промпт `sdr_qualifier`.
5. Перед финализацией проверь, что prompt не ужат до compact/policy-summary версии.
6. Сохрани итоговый промпт как отдельный артефакт.

## Hard Rules

- Используй только `sdr_qualifier`, а не `interviewer`.
- Сохраняй fixed JSON output.
- Используй только confirmed safe DB write contract.
- Разрешай CRM actions только если они явно подтверждены в profile / runtime contract.
- Не выпускай prompt с абстрактной фразой про CRM. В prompt должен быть явный CRM gate:
  - `crm_enabled`;
  - `crm_type`;
  - `crm_write_enabled`;
  - exact CRM actions only if confirmed.
- Если CRM не подтверждена или runtime не дал exact actions, итоговый prompt обязан требовать полный `skip CRM`.
- Не разрешай `products_live` lookup, `exact_match`, `relaxed_match` или `category_browse`.
- Не проваливайся в plain text, если downstream ожидает fixed JSON.
- Не выпускай short / compact / compressed prompt по умолчанию.
- Для sales/runtime use case итоговый prompt должен быть heavy production prompt, а не короткий policy-summary.
- Skeleton использовать как structural base, но не как основание для сокращения prompt.
- Если пользователь явно не просил compact version, builder обязан выпускать длинный prompt с полной operational детализацией.
- Prompt невалиден, если critical rules схлопнуты в короткий policy-summary без explicit operational detail.
- Prompt обязан содержать:
  - orientation-first rule;
  - no pseudo-handoff rule;
  - post-consultation handoff mode;
  - lead-capture after consultation;
  - first-reply discipline;
  - minimal semantic qualification package;
  - natural phone gate;
  - mcp_log discipline.
- Если в runtime/profile подтвержден `MCP Postgres` lead write-back path, итоговый prompt обязан содержать явный `Safe DB contract`.
- Нельзя выпускать prompt квалификатора, где есть инструмент `MCP Postgres`, но нет explicit логики записи в лид-профиль.
- Если используется safe lead-profile write-back, prompt обязан явно содержать:
  - `public.update_lead_profile_safe(...)`;
  - список разрешенных параметров;
  - sequencing `qualification_summary -> DB write-back -> confirmed CRM sync -> user-facing reply`;
  - правило, что `p_qualification_summary` обновляется при каждом meaningful new fact.
- Если в profile указано `crm_enabled = true`, prompt обязан явно различать:
  - CRM включена на уровне проекта;
  - CRM write остается runtime-gated;
  - без exact runtime actions CRM write не выполняется.
- Prompt обязан явно требовать summary write-back discipline: meaningful new facts должны отражаться в `p_qualification_summary`, если DB runtime доступен.
- Prompt обязан явно требовать useful handoff payload, а не completion по одному только телефону.
- Если этих правил нет в финальном prompt, сборка считается проваленной, а prompt — не production-ready.

## Обязательные references

Сначала прочитай:
- `references/sdr-role-contract.md`
- `references/sdr-db-and-crm.md`
- `../prompt-architecture/templates/SDR_QUALIFIER_SKELETON.md`
- `../prompt-architecture/references/MATURE_SDR_QUALIFIER_BASELINE.md`
- `../prompt-architecture/references/CYBEROP_HEAVY_PROMPT_STANDARD.md`
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
- orientation-first и post-consultation handoff mode;
- natural phone gate;
- mcp_log discipline;
- правило `DB first, CRM second`;
- heavy production completeness;
- отсутствие unjustified compression.

Если пользователь явно просит, рядом можно сохранить и input profile snapshot, но по умолчанию этот навык не должен пересобирать brief.
