# Prompt Builder Contract

## Назначение

Builder собирает итоговый prompt из:
- `brief`;
- `input_profile`;
- role skeleton;
- heavy mature baseline;
- domain layer;
- tool/live/output/state layer.

## Build order

1. Прочитать `brief`.
2. Собрать или нормализовать `input_profile`.
3. Определить роль: `consultant` или `sdr_qualifier`.
4. Взять соответствующий skeleton.
5. Взять mature baseline для полноты production prompt.
6. Для sales/runtime prompts обязательно свериться с `CYBEROP_HEAVY_PROMPT_STANDARD.md`.
7. Добавить company/domain layer:
   - терминология;
   - категории;
   - ограничения бизнеса;
   - типовые user intents.
8. Добавить data-source layer:
   - RAG;
   - `product_memory`, если он есть;
   - live table contracts;
   - source priority.
9. Добавить technical layer:
   - tools;
   - DB write rules;
   - optional external-system rules only if explicitly enabled in `input_profile`;
   - allowed/forbidden actions.
10. Добавить handoff/state/output layer.
11. Сверить результат с mature baseline для той же роли.
12. Проверить, что prompt не был unjustifiably compressed.
13. Сохранить `input_profile` и итоговый `prompt_*.md`.

## Mandatory sections mode

Для sales/runtime prompt builder обязан работать в режиме `mandatory sections`.

Это означает:
- сначала составить список обязательных секций для выбранной роли;
- затем заполнить каждую секцию project-specific содержанием;
- только после этого склеивать итоговый prompt;
- не разрешается пропускать секцию только потому, что модель считает ее "понятной из контекста";
- не разрешается заменять literal technical block кратким пересказом.

## Validation gates

Перед тем как считать prompt готовым, builder обязан проверить:
- роль не смешана с другой полноценной ролью;
- все critical tool contracts описаны явно;
- live schema не выдумана;
- output contract определен;
- state/handoff rules определены;
- anti-hallucination rules присутствуют;
- mature baseline invariants не потеряны.
- heavy baseline invariants не потеряны.
- Если prompt относится к sales/runtime flows, builder обязан выпускать heavy prompt, а не compact prompt.
- Prompt невалиден, если critical sections схлопнуты в короткий policy-summary без explicit operational rules.
- Если пользователь явно не просил short/compact version, compressed prompt считается ошибкой сборки.
- Builder обязан использовать `CYBEROP_HEAVY_PROMPT_STANDARD.md` как completeness reference для sales/runtime prompts.
- Если в `available_tools` или runtime contract присутствует `MCP Postgres` и он используется не только для чтения, prompt обязан содержать explicit DB write-back layer.
- Если в проекте подтверждена lead memory или live factual layer, `MCP Postgres` должен считаться обязательным инструментом, а не optional convenience tool.
- Для `consultant` это означает явный блок `Write-back and memory` или эквивалент с `consultation_summary`.
- Для `sdr_qualifier` это означает явный `Safe DB contract`, allowed params и sequencing persistence.
- Для `sdr_qualifier` safe DB contract нельзя описывать абстрактно: если проект использует `public.update_lead_profile_safe(...)`, builder обязан требовать canonical call pattern с `p_lead_id => <lead_id>::integer`, named args, явными кастами и typed null.
- Для `sdr_qualifier` literal canonical SQL block считается обязательной секцией, а не опциональным примером.
- Для `consultant` project-specific live schema, category values, attribute keys, commercial facts и write-back discipline считаются обязательными секциями, если они подтверждены в brief/profile/project docs.
- Наличие `MCP Postgres` в tools без описанной логики записи в лид-профиль считается ошибкой сборки prompt.
- Prompt нельзя считать production-ready, если `result_summary` описан, но persisted memory / summary write-back contract отсутствует.
- По умолчанию CRM считается выключенной для prompt-а.
- Если CRM не подтверждена до exact-action уровня, builder обязан полностью исключить CRM-слой из итогового prompt.
- В этом режиме итоговый prompt не должен содержать слова или tool names: `CRM`, `AMO`, `AmoCRM`, `amoCRM`, `MCP CRM`, `MCP AmoCRM`, `skip CRM`.
- Builder обязан сначала определить:
  - `crm_enabled`
  - `crm_type`
  - `crm_write_enabled`
  - `crm_exact_actions`
  и только потом решать, включать ли CRM-слой вообще.
- CRM-слой можно включать в итоговый prompt только если `crm_enabled = true`, `crm_write_enabled = true` и `crm_exact_actions` непустой.
- Перед сохранением итогового prompt builder обязан выполнить text audit.
- Если CRM-слой не включен явно, итоговый prompt считается невалидным при любом вхождении:
  - `CRM`
  - `crm`
  - `AMO`
  - `AmoCRM`
  - `amoCRM`
  - `MCP CRM`
  - `MCP AmoCRM`
  - `skip CRM`

## Hard prohibitions

- не использовать workflow JSON как основной источник prompt-смысла;
- не собирать prompt напрямую из `brief` без skeleton;
- не выдумывать отсутствующие technical contracts;
- не сохранять только итоговый prompt без рядом лежащего input profile.
- не выпускать compact/compressed sales prompt по умолчанию.
- не считать skeleton-only short version production-ready для sales/runtime use case.
- не завершать сборку prompt, если `MCP Postgres` присутствует в проекте, но в prompt отсутствует explicit логика `public.update_lead_profile_safe(...)` или project-safe write-back contract.
- не завершать сборку `sdr_qualifier`, если safe DB contract разрешает укороченный SQL-вызов, пропускает `p_lead_id`, допускает untyped `NULL` или не фиксирует named-argument форму `=>`.
- не завершать сборку prompt, если хотя бы одна обязательная секция роли отсутствует как самостоятельный явный блок.
- не завершать сборку sales/runtime prompt, если project-specific sections схлопнуты в generic fallback при наличии подтвержденных project docs.
- не выпускать prompt, где есть любое упоминание `CRM`, `AMO`, `AmoCRM`, `MCP CRM` или `MCP AmoCRM`, если в `input_profile` не подтверждены exact CRM actions.
