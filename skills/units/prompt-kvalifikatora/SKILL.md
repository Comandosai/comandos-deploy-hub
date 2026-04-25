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
4. Сначала собери полный project contract по обязательным секциям, а не начинай сразу писать финальный prompt.
5. Заполни master template квалификатора секция за секцией.
6. Собери только системный промпт `sdr_qualifier`.
7. Перед финализацией проверь, что prompt не ужат до compact/policy-summary версии.
8. Сохрани итоговый промпт как отдельный артефакт.

## Hard Rules

- Используй только `sdr_qualifier`, а не `interviewer`.
- Сохраняй fixed JSON output.
- Для текущего sales bundle output contract должен совпадать с workflow-контрактом буквально по именам полей.
- Для квалификатора запрещено переименовывать поля по смыслу.
- Если downstream contract ожидает `text_to_user`, `status`, `recommended_next_step`, `result_summary`, `is_qualified`, builder не имеет права заменять их на `reply_to_user`, `reply`, `user_reply`, `message_to_user`, `qualification_status` или любые другие варианты.
- Используй только confirmed safe DB write contract.
- На текущем этапе CRM не включать в итоговый prompt вообще.
- Если `crm_enabled`, `crm_write_enabled` и exact runtime actions не подтверждены явно, итоговый prompt не должен содержать слова или tool names: `CRM`, `AMO`, `AmoCRM`, `amoCRM`, `MCP CRM`, `MCP AmoCRM`, `skip CRM`.
- Не выпускай prompt с абстрактной фразой про CRM или с упоминанием CRM как будущей/неактивной возможности.
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
  - result_summary discipline.
- Prompt обязан явно фиксировать exact output field names для текущего workflow-контракта.
- Если в runtime/profile подтвержден `MCP Postgres` lead write-back path, итоговый prompt обязан содержать явный `Safe DB contract`.
- Нельзя выпускать prompt квалификатора, где есть инструмент `MCP Postgres`, но нет explicit логики записи в лид-профиль.
- Если используется safe lead-profile write-back, prompt обязан явно содержать:
  - `public.update_lead_profile_safe(...)`;
  - список разрешенных параметров;
  - канонический call pattern с `p_lead_id => <lead_id>::integer`;
  - sequencing `qualification_summary -> DB write-back -> user-facing reply`;
  - правило, что `p_qualification_summary` обновляется при каждом meaningful new fact.
  - запрет на укороченный или ad-hoc SQL-вызов.
- CRM-слой добавлять только отдельным будущим этапом, когда будет явная команда подключать CRM и в profile появятся confirmed exact actions.
- Prompt обязан явно требовать summary write-back discipline: meaningful new facts должны отражаться в `p_qualification_summary`, если DB runtime доступен.
- Prompt обязан явно требовать useful handoff payload, а не completion по одному только телефону.
- Если этих правил нет в финальном prompt, сборка считается проваленной, а prompt — не production-ready.
- Builder обязан работать в режиме `mandatory sections`, а не в режиме свободного сочинения.
- Нельзя перескакивать сразу к финальному prompt до заполнения всех обязательных секций master template.
- Если хотя бы одна critical section отсутствует, схлопнута до короткого summary или заменена общими словами, сборка считается проваленной.

## Mandatory sections

Итоговый prompt квалификатора обязан содержать отдельные явные секции:
- `Role / Goal / Scope`
- `Hard Role Isolation`
- `Main Qualification Logic`
- `Orientation-first Rule`
- `First-reply Discipline`
- `Post-consultation Handoff Mode`
- `Data Sources and Routing Boundaries`
- `MCP Postgres: Mandatory Safe DB Contract`
- `Allowed / Forbidden Actions`
- `Dialog Policy`
- `Status Machine`
- `Fixed JSON Output Contract`
- `Anti-patterns`
- `Final Self-check`

Если одна из этих секций отсутствует или заменена коротким пересказом, prompt невалиден.

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
- правило обязательного `p_lead_id`;
- canonical safe call pattern с named args и typed null;
- явная sequencing discipline;
- явное правило, что qualification write-back обязателен при meaningful new fact.
- orientation-first и post-consultation handoff mode;
- natural phone gate;
- result_summary discipline;
- правило `DB first, reply after persistence`;
- heavy production completeness;
- отсутствие unjustified compression.
- отдельные заголовки или явные блоки для всех `Mandatory sections`;
- literal canonical SQL block, а не только упоминание safe function;
- явный запрет на `=` вместо `=>`, untyped `NULL` и ad-hoc сокращения safe call pattern.
- literal exact output contract с полями:
  - `text_to_user`
  - `status`
  - `recommended_next_step`
  - `result_summary`
  - `is_qualified`
- явный запрет на поля:
  - `reply_to_user`
  - `reply`
  - `user_reply`
  - `message_to_user`
  - `qualification_status`

Перед сохранением итогового prompt обязательно выполнить text audit.
Если CRM-слой не включен отдельной явной командой, итоговый prompt невалиден при любом вхождении:
- `CRM`
- `crm`
- `AMO`
- `AmoCRM`
- `amoCRM`
- `MCP CRM`
- `MCP AmoCRM`
- `skip CRM`

Если пользователь явно просит, рядом можно сохранить и input profile snapshot, но по умолчанию этот навык не должен пересобирать brief.

Для этого навыка workflow JSON не является источником общего prompt-смысла, но exact output field names из живого workflow-контракта являются обязательным источником истины и не подлежат свободному переименованию.
