---
name: Подключение отдела продаж
description: Подключает существующие Supabase и n8n клиента, загружает workflow отдела продаж и тестового агента, создает и привязывает соединения Supabase, Postgres и MCP, при необходимости подключает OpenRouter, OpenAI и Telegram, а затем выполняет первичную проверку работоспособности. Использовать, когда у клиента уже есть или почти готова инфраструктура и нужно быстро собрать рабочий контур без ручной рутины.
---

# Подключение отдела продаж

Этот навык нужен для настройки уже существующей клиентской инфраструктуры:
- сначала проверить, есть ли в корне проекта файл `DANNYE_DLYA_RAZVERTYVANIYA.md`;
- если файл есть, читать доступы и ключи оттуда;
- если файла нет, спрашивать только недостающие поля;
- найти или принять доступы к `Supabase`;
- найти или принять доступы к `n8n`;
- скачать закрытый архив workflow по `x_license_key`;
- загрузить workflow из скачанного архива;
- загрузить внутренний `07_WF_CRM_Operator`, если в пакете используется CRM-оператор;
- создать и привязать соединения;
- отдельно поднять тестового ИИ-агента для проверки базы;
- при необходимости подготовить Telegram-тестирование.

## Что делать в первую очередь

1. Прочитай [порядок действий](references/poryadok-deystviy.md).
2. Прочитай [обязательные доступы и ключи](references/dostupy-i-klyuchi.md).
3. Прочитай [карту workflow](references/karta-workflow.md).
4. Прочитай [preflight-проверку](references/preflight-proverka.md).
5. Прочитай [поиск секретов](references/poisk-sekretov.md).
6. Прочитай [Credential Binding LITE](references/credential-binding-lite.md).
7. Прочитай [закрытую загрузку workflow](references/zakrytaya-zagruzka-workflow.md).

Тяжёлые reference-файлы читать только когда дошёл до соответствующей фазы:
- [аудит перепривязки](references/audit-pereprivyazki.md) — только на этапе `Workflow import + rebind audit`;
- [runtime readiness](references/runtime-readiness.md) — только на этапе `Runtime readiness`.

Если пользователь просит подключить тестового ИИ-агента для проверки базы, дополнительно прочитай:
- [prompt для тестового агента](references/prompt-testovogo-agenta.md)

Если пользователь просит подключить Telegram-тестирование, дополнительно используй:
- [$Тестировщик продаж в Telegram](/Users/artemlahtin/.codex/skills/telegram-sales-tester/SKILL.md)

## Основные правила

- Все названия и пояснения держать по-русски.
- Не спрашивать у пользователя все подряд. Спрашивать только то, что не удалось определить автоматически.
- Если есть `DANNYE_DLYA_RAZVERTYVANIYA.md`, сначала читать его.
- Если `Supabase` и `n8n` уже стоят, не разворачивать их заново.
- Не плодить дубликаты соединений, если корректные уже существуют.
- Для `MCP` поле `x-license-key` обязательно. Без него настройка `MCP` не считается завершенной.
- Workflow отдела продаж не лежат в открытом GitHub как источник файлов. Перед импортом всегда скачивать закрытый архив `sales-workflows` через `api.comandos.ai` по `x_license_key`.
- Если `x_license_key` отсутствует, не импортировать workflow и спросить только этот ключ.
- Нельзя придумывать workflow вручную или искать их в интернете: источник файлов только закрытый архив.
- Если в `DANNYE_DLYA_RAZVERTYVANIYA.md` уже есть `x_license_key`, не просить у пользователя ручные headers для `MCP AmoCRM`, а собрать credential автоматически.
- Для `MCP Postgres` одного `x_license_key` недостаточно: нужны все DB-параметры и 7 HTTP headers.
- Если `OpenRouter`, `OpenAI` или `Telegram` для конкретного сценария не нужны, не требовать их.
- При создании и аудите credentials в n8n 2.x использовать runtime-first политику: `credential.id` считается валидным, если он непустой и принимается текущим n8n runtime; формат и длину `id` skill не нормирует.
- Для OpenAI использовать правильный type `openAiApi`, для Multiple Headers — структуру `headers.values`, для CLI-импорта — `--project <current_project_id>`.
- UI-created credential считать нормой, если он проходит runtime: skill не должен переписывать его структуру только ради приведения к старому JSON-шаблону.
- `null` или пустые значения в non-secret полях credential сами по себе не считаются ошибкой, если publish/activate и runtime execution проходят.
- Для длинных операций по `n8n`, `psql`, JSON-экспорту и импорту использовать интерактивную SSH-сессию как основной режим, а не одноразовые короткие команды.
- Все диагностические SQL по `n8n` писать через `nodes::jsonb`, а не через голый `nodes`.
- После импорта workflow всегда делать аудит неразрешенных credentials и project sharing до любых тестовых запусков.
- После импорта workflow всегда выполнять обязательный credential rebind: для каждого refs, где есть `name`, но нет `id`, находить credential по паре `(type + name)` и дописывать `id`.
- Если после credential rebind остался хотя бы один refs с `name` без `id`, этап считается проваленным.
- Наличие credential с нужным именем, успешный `test connection` и успешный импорт workflow не считаются доказательством готовности workflow.
- Единственный правильный критерий готовности credential binding: в каждом `node.credentials[type]` сохранены и `name`, и валидный `id`, а runtime не падает с `Found credential with no ID`.
- Пока не доказано, что refs без `id` больше нет, запрещено:
  - публиковать workflow;
  - активировать workflow;
  - запускать Telegram Trigger;
  - завершать этап как `готово`.
- После импорта workflow всегда назначать общий error workflow всем импортированным workflow, кроме самого workflow ошибок.
- `settings.errorWorkflow` нельзя считать готовым по ID из JSON-шаблона: нужно найти живой workflow `Уведомления об ошибках в N8N` в текущем n8n и подставить его актуальный `id`.
- Если у любого workflow, кроме `Уведомления об ошибках в N8N`, не задан `settings.errorWorkflow`, подключение workflow-пакета считается незавершенным.
- При первом импорте workflow не активировать весь боевой отдел продаж автоматически.
- При первом разворачивании активировать или публиковать только `06_WF_Test` и workflow `Уведомления об ошибках в N8N`.
- Боевые workflow `01_Ingress_Channel_Intake`, `02_Main_Orcestrator`, `03_WF_Qualification`, `04_WF_Consultation`, `05_WF_Human_Handoff_Workflow` и `07_WF_CRM_Operator` держать выключенными до отдельного этапа боевого запуска.
- `07_WF_CRM_Operator` считать внутренним workflow: при первом импорте его нужно импортировать и привязать, но не активировать раньше времени как отдельный входящий сценарий.
- При отдельном этапе боевого запуска и финального теста `07_WF_CRM_Operator` нужно публиковать или активировать вместе с остальными рабочими workflow, если он есть в пакете и участвует в текущем маршруте.
- Боевые workflow можно активировать только после успешной проверки базы через `06_WF_Test` и явной команды пользователя на запуск отдела продаж.
- Перед импортом workflow всегда проверять наличие обязательных custom node packages и credential types.
- После импорта workflow нельзя завершать этап, пока не проверены editor `n8n`, свежие логи `n8n` и отсутствие битых credential refs.
- После каждого этапа самому предлагать следующий практический шаг в одном готовом копируемом `text`-блоке.
- Если предыдущие этапы уже выполнены, пропускать их и предлагать только то, что действительно осталось сделать.
- Не заставлять пользователя вручную выбирать между очевидными следующими действиями, если состояние инфраструктуры уже известно.

## Обязательные фазы выполнения

1. `Preflight`
- проверить контейнеры и состояние `n8n`;
- определить `project_id`;
- проверить установленные custom node packages;
- проверить зарегистрированные credential types;
- отдельно проверить:
  - `@comandosai/n8n-nodes-amo-crm`;
  - `@comandosai/n8n-nodes-doc-extract`;
  - `comandosLsiKeysApi`.

2. `Secret discovery`
- искать секреты сначала автоматически;
- проверять `.env`, docker env, рабочие каталоги и конфиги стека;
- разделять результат на:
  - `нашел и привязал`;
  - `не нашел, нужно спросить у пользователя`.

3. `Workflow import + rebind audit`
- скачать закрытый архив workflow по `x_license_key`;
- распаковать архив во временную папку;
- проверить, что внутри есть `manifest.json` и папка `workflows`;
- импортировать workflow;
- собрать список live credentials из `credentials_entity`;
- сопоставить credentials по паре `(type + name)`;
- пройти все nodes с credentials в целевых workflow и проверить не только `credentials.<type>.name`, но и `credentials.<type>.id`;
- проверить все refs `node.credentials` и найти случаи, где:
  - `name` есть;
  - `id` отсутствует, пустой или `null`;
- считать binding сломанным даже если credential существует в системе, `test connection` проходит и UI показывает credential как выбранный;
- выполнить credential rebind по правилу `(type + name) -> credentials_entity.id`;
- повторно проверить, что refs с `name` без `id` больше нет;
- если хотя бы один такой refs остался, остановить этап с явной ошибкой и не переходить к активации;
- отдельно выполнить runtime credential audit для `02_Main_Orcestrator`, `03_WF_Qualification`, `04_WF_Consultation` и `05_WF_Human_Handoff_Workflow`;
- найти актуальный `id` workflow `Уведомления об ошибках в N8N`;
- прописать этот `id` в `settings.errorWorkflow` всех workflow пакета, кроме самого workflow ошибок;
- проверить, что `settings.errorWorkflow` реально сохранен у `01-06`;
- после импорта выставить режим активации:
  - `06_WF_Test` активировать или опубликовать;
  - `Уведомления об ошибках в N8N` активировать или опубликовать с `telegram_error_bot_token`;
  - все боевые workflow и `07_WF_CRM_Operator` оставить выключенными до отдельного боевого запуска;
- проверить unresolved credentials;
- проверить refs, у которых есть `name`, но отсутствует `id`;
- различать:
  - credential не существует вообще;
  - credential существует, но не расшарен в проект.

4. `Runtime readiness`
- проверить не только credentials, но и наличие самих node packages;
- если нужного пакета нет, докачать его до тестов;
- если отсутствует credential type, поставить provider package или остановиться с явной ошибкой.
- для каждого боевого workflow проверить draft и active/published version по отдельности, если опубликованная версия уже существует;
- убедиться, что после rebind и сохранения binding с `id` не потерялся в active/published version;
- до финального Telegram-теста выполнить отдельный smoke-test `02_Main_Orcestrator`, `03_WF_Qualification`, `04_WF_Consultation`, `05_WF_Human_Handoff_Workflow` и `07_WF_CRM_Operator`, если он есть в пакете;
- открыть editor `n8n` после полного refresh страницы и убедиться, что он не уходит в постоянный `Connection lost`;
- проверить свежие логи `n8n` и убедиться, что там нет:
  - `Found credential with no ID`;
  - `Authorization failed - please check your credentials`;
  - `Workflow activation failed validation`;
  - `User attempted to access a workflow without permissions`.

## Что нужно проверять и докачивать по умолчанию

- Если отсутствует `@comandosai/n8n-nodes-doc-extract`, его нужно докачать, потому что без него часть workflow формально импортируется, но не исполняется.
- Если отсутствует `@comandosai/n8n-nodes-amo-crm`, его нужно докачать до этапа привязки workflow.
- Если отсутствует credential type `comandosLsiKeysApi`, нужно:
  - либо установить provider package;
  - либо остановиться и сообщить, что custom credential type не зарегистрирован.
- Для `MCP Postgres` надо помнить, что endpoint живет в node, а credential хранит headers.
- Для `MCP Postgres` использовать endpoint `https://postgres.mcp.comandos.ai/`.
- Для `MCP Postgres` использовать только точные имена базовых headers:
  - `db_host`
  - `db_port`
  - `db_name`
  - `db_user`
  - `db_password`
  - `db_schema`
  - `x-license-key`
- Дополнительный header `tenant_id` допустим как расширение и не считается несовместимостью, если runtime принимает credential.
- Не использовать альтернативные варианты заголовков вроде `DB_HOST`, `database_host`, `x_license_key`, `db-user`.
- Для `MCP Postgres` credential data должен использовать структуру `headers.values`.
- Для `MCP Postgres` нельзя создавать credential только по `x_license_key`.
- Для внешнего `Supabase/Postgres` надо отдельно проверять, не требуется ли Supavisor-style username вместо простого `postgres`.
- Для `MCP AmoCRM` нужен отдельный блок настройки и отдельная проверка доступности endpoint.
- Для `MCP AmoCRM` по умолчанию использовать endpoint `https://amocrm.mcp.comandos.ai` и credential с именем `MCP AmoCRM`.
- Если `x_license_key` уже найден в файле данных или на сервере, создать `MCP AmoCRM` автоматически через `HTTP Multiple Headers Auth` с header `x-license-key`.
- Запрашивать ручные headers или существующий credential для `MCP AmoCRM` только если `x_license_key` отсутствует или автоматическая сборка не сработала.
- Для `Supabase` credential обязательно использовать host/API URL и `supabase_service_role_key`; anon key не подходит как замена.
- Для Telegram создавать два отдельных credentials, если есть оба токена:
  - `Telegram Sales Bot` из `telegram_sales_bot_token`;
  - `Telegram Error Bot` из `telegram_error_bot_token`.
- Для всех credentials типа `telegramApi` в этом проекте сохранять `baseUrl = null`.
- Не валидировать `baseUrl` у `telegramApi` как обязательное поле и не подставлять `https://api.telegram.org` вручную.
- `baseUrl = null` для `telegramApi` считать нормальным рабочим состоянием, если runtime принимает credential и Telegram-узлы проходят publish/activate.
- Перед активацией Telegram Trigger выполнять `deleteWebhook` для соответствующего bot token и после активации проверять регистрацию webhook.

## Что должно быть на выходе

Навык должен привести проект к состоянию:
- `Supabase` найден и проверен;
- `n8n` найден и проверен;
- `n8n project_id` определен;
- обязательные packages и credential types проверены и при необходимости докачаны;
- workflow загружены;
- `07_WF_CRM_Operator` импортирован и привязан, если он есть в пакете;
- соединения `Supabase`, `Postgres`, `MCP` созданы и привязаны;
- отдельно проверены `MCP Postgres` и `MCP AmoCRM`;
- project sharing проверен;
- editor `n8n` после импорта и перепривязки открывается стабильно, без `Connection lost`;
- в свежих логах `n8n` нет ошибок битых credentials или workflow validation;
- при необходимости созданы соединения `OpenRouter`, `OpenAI`, `Telegram`;
- тестовый агент для проверки базы установлен;
- сделан хотя бы один тестовый прогон;
- сформирован краткий итоговый отчет.
- выдан следующий готовый шаг: Telegram-тестирование, если контур уже собран, или другой пропущенный этап, если он еще не завершен.
