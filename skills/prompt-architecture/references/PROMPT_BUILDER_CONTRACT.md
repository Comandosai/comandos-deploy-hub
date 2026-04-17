# Prompt Builder Contract

## Назначение

Builder собирает итоговый prompt из:
- `brief`;
- `input_profile`;
- role skeleton;
- domain layer;
- tool/live/output/state layer.

## Build order

1. Прочитать `brief`.
2. Собрать или нормализовать `input_profile`.
3. Определить роль: `consultant` или `sdr_qualifier`.
4. Взять соответствующий skeleton.
5. Добавить company/domain layer:
   - терминология;
   - категории;
   - ограничения бизнеса;
   - типовые user intents.
6. Добавить data-source layer:
   - RAG;
   - `product_memory`, если он есть;
   - live table contracts;
   - source priority.
7. Добавить technical layer:
   - tools;
   - CRM rules;
   - DB write rules;
   - allowed/forbidden actions.
8. Добавить handoff/state/output layer.
9. Сверить результат с mature baseline для той же роли.
10. Сохранить `input_profile` и итоговый `prompt_*.md`.

## Validation gates

Перед тем как считать prompt готовым, builder обязан проверить:
- роль не смешана с другой полноценной ролью;
- все critical tool contracts описаны явно;
- live schema не выдумана;
- output contract определен;
- state/handoff rules определены;
- anti-hallucination rules присутствуют;
- mature baseline invariants не потеряны.
- Если в `available_tools` или runtime contract присутствует `MCP Postgres` и он используется не только для чтения, prompt обязан содержать explicit DB write-back layer.
- Если в проекте подтверждена lead memory или live factual layer, `MCP Postgres` должен считаться обязательным инструментом, а не optional convenience tool.
- Для `consultant` это означает явный блок `Write-back and memory` или эквивалент с `consultation_summary`.
- Для `sdr_qualifier` это означает явный `Safe DB contract`, allowed params и sequencing persistence.
- Наличие `MCP Postgres` в tools без описанной логики записи в лид-профиль считается ошибкой сборки prompt.
- Prompt нельзя считать production-ready, если `result_summary` описан, но persisted memory / summary write-back contract отсутствует.
- Если CRM не подтверждена до exact-action уровня, builder обязан собирать prompt с явным `skip CRM` и не имеет права описывать `MCP CRM` как активный tool path.
- Builder обязан сначала определить:
  - `crm_enabled`
  - `crm_type`
  - `crm_write_enabled`
  - `crm_exact_actions`
  и только потом решать, включать ли CRM-слой вообще.

## Hard prohibitions

- не использовать workflow JSON как основной источник prompt-смысла;
- не собирать prompt напрямую из `brief` без skeleton;
- не выдумывать отсутствующие technical contracts;
- не сохранять только итоговый prompt без рядом лежащего input profile.
- не завершать сборку prompt, если `MCP Postgres` присутствует в проекте, но в prompt отсутствует explicit логика `public.update_lead_profile_safe(...)` или project-safe write-back contract.
- не выпускать prompt, где `MCP CRM` упомянут как рабочий инструмент, если в `input_profile` не подтверждены exact CRM actions.
