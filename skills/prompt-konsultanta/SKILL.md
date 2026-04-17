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
4. Прочитай canonical skeleton, mature baseline и builder contract.
5. Сначала собери полный project-specific consultant contract по обязательным секциям.
6. Заполни master template консультанта секция за секцией.
7. Собери только системный промпт `consultant`.
8. Перед финализацией проверь, что prompt не ужат до compact/policy-summary версии.
9. Сохрани итоговый промпт как отдельный артефакт.

## Hard Rules

- `attributes_json` должен оставаться source of truth для product attributes.
- Используй confirmed category values и canonical normalizations из project contract.
- Если project profile задаёт более точный live schema contract, он важнее generic fallback.
- Реальные варианты можно показывать только после live lookup.
- Если `exact_match` не сработал, переходи в `relaxed_match`, затем в `category_browse`, а не повторяй `exact`.
- Не подмешивай qualifier JSON, phone gate или intake-only flow.
- Если есть `product_memory`, используй его до broad live relaxation.
- Prompt обязан содержать отдельный conversational layer:
  - deep consultation before handoff;
  - explain-the-distinction rule;
  - first-candidate-is-not-complete rule;
  - chosen-branch narrowing rule;
  - first-step recommendation rule;
  - follow-up question discipline;
  - plain-text hygiene без внутренних schema-ярлыков.
- Если в runtime/profile подтвержден `MCP Postgres` write-back path для лида, итоговый prompt обязан содержать явный блок `Write-back and memory`.
- Нельзя выпускать prompt консультанта, где `MCP Postgres` описан только как read-only tool, но отсутствует логика обновления `consultation_summary`.
- Если используется safe lead-profile write-back, prompt обязан явно требовать:
  - обновление `consultation_summary` после каждого meaningful consultation fact;
  - использование только confirmed safe path `public.update_lead_profile_safe(...)`;
  - запрет считать `result_summary` заменой persisted memory;
  - последовательность `summary refresh -> DB write-back -> confirmed CRM sync -> user-facing reply`.
- Если пользователь подтвердил конкретный стандартный вариант и количество уже известно, prompt обязан завершать консультацию через `completed + human_handoff`.
- Prompt не должен разрешать `create_lead`, автономное создание заказа, автономное создание сделки или autonomous order acceptance со стороны consultant.
- Prompt не должен считать первый shortlist, первый browse result или первый narrowed path достаточным основанием для `completed`.
- Не выпускай short / compact / compressed prompt по умолчанию.
- Для sales/runtime use case итоговый prompt должен быть heavy production prompt, а не короткий policy-summary.
- Skeleton использовать как structural base, но не как основание для сокращения prompt.
- Если пользователь явно не просил compact version, builder обязан выпускать длинный prompt с полной operational детализацией.
- Prompt должен быть ближе по полноте к `Cyber_op`-style production prompt, чем к короткой skeleton-only версии.
- Если этих правил нет в финальном prompt, сборка считается проваленной, а prompt — не production-ready.
- Builder обязан работать в режиме `mandatory sections`, а не в режиме свободной компоновки.
- Нельзя перескакивать сразу к финальному prompt до заполнения всех обязательных секций master template.
- Если хотя бы одна critical section отсутствует, схлопнута до короткого summary или заменена общими словами, сборка считается проваленной.

## Mandatory sections

Итоговый prompt консультанта обязан содержать отдельные явные секции:
- `Role / Goal / Scope`
- `Обязательные источники и порядок работы`
- `Live schema`
- `Search contract`
- `Commercial and safety boundaries`
- `Deep consultation before handoff`
- `Search modes`
- `Output contract`
- `Humanization operating mode`
- `Conversational micro-rules`
- `Completion threshold`
- `Result-summary discipline`
- `Consultation-summary write-back rule`
- `Final self-check`

Если одна из этих секций отсутствует или заменена коротким пересказом, prompt невалиден.

## Обязательные references

Сначала прочитай:
- `references/consultant-role-contract.md`
- `references/consultant-live-search.md`
- `../prompt-architecture/templates/CONSULTANT_SKELETON.md`
- `../prompt-architecture/references/MATURE_CONSULTANT_BASELINE.md`
- `../prompt-architecture/references/CYBEROP_HEAVY_PROMPT_STANDARD.md`
- `../prompt-architecture/references/PROMPT_BUILDER_CONTRACT.md`

## Выход

Навык должен вернуть и сохранить:
- один готовый системный промпт `consultant`.

Перед завершением навык обязан проверить, что в итоговом prompt есть:
- explicit `Write-back and memory` или эквивалентный блок;
- явное правило `Никогда не пиши в products_live`;
- явное правило обновления `consultation_summary`;
- если write-back path подтвержден, упоминание `public.update_lead_profile_safe(...)`.
- explicit conversational micro-rules;
- явное правило `first candidate != complete`;
- terminal rule после confirmed selection;
- heavy production completeness;
- отсутствие unjustified compression.
- отдельные заголовки или явные блоки для всех `Mandatory sections`;
- project-specific live schema, category values, attribute keys и commercial facts не схлопнуты до generic fallback, если они подтверждены в проектных документах.

Если пользователь явно просит, рядом можно сохранить и input profile snapshot, но по умолчанию этот навык не должен пересобирать brief.
