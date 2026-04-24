# Полный запуск отдела продаж

Это верхнеуровневый навык, который ведет пользователя через весь сценарий внедрения как через один проект.
Источник шагов для запуска: разделы `Команда 1..12` в этом `README.md`.

Что делает:
- читает общий файл входных данных проекта;
- читает общий файл контекста внедрения;
- понимает, что уже готово;
- определяет следующий релевантный этап;
- предлагает только один следующий шаг;
- направляет пользователя в нужный поднавык;
- после завершения этапа обновляет контекст и ведет дальше.

## Короткий порядок (как идти по шагам)

1. Установить навык `Полный запуск отдела продаж`.
2. Установить или обновить `n8n`.
3. Найти или поднять `Supabase`.
4. Подготовить документы.
5. Отдельной командой загрузить документы в базу (runner/ingestion).
6. Подключить отдел продаж (`workflow`, `credentials`, `MCP`).
7. Протестировать бота в Telegram.
8. Собрать `brief`.
9. Собрать промпт квалификатора.
10. Собрать промпт консультанта.
11. Вставить промпты в боевые `workflow`.
12. Выключить `06_WF_Test` и провести финальное тестирование.
13. Снять структуру AmoCRM.
14. Собрать CRM-карту AmoCRM.
15. Собрать AmoCRM-промпты и workflow.
16. Провести AmoCRM sales-тест.

Полный детальный сценарий — ниже в командах 1-16. Не сокращать и не переставлять шаги местами без причины.

## Когда использовать

Использовать, когда нужно не просто выполнить один этап, а вести весь проект внедрения как единый сценарий:
- `n8n`
- база знаний и векторизация
- подключение отдела продаж
- Telegram-тестирование
- сборка `brief`
- сборка промпта консультанта
- сборка промпта квалификатора
- подключение AmoCRM через отдельный `crm_operator`
- сборка CRM-карты и промпта оркестратора

## На чем он опирается

Общие файлы:
- [DANNYE_DLYA_RAZVERTYVANIYA.md](../DANNYE_DLYA_RAZVERTYVANIYA.md)
- [KONTEXT_VNEDRENIYA_OTDELA_PRODAZH.md](../KONTEXT_VNEDRENIYA_OTDELA_PRODAZH.md)
- [RHYTHM_VNEDRENIYA_OTDELA_PRODAZH.md](../RHYTHM_VNEDRENIYA_OTDELA_PRODAZH.md)

Поднавыки:
- [Развертывание и обновление n8n](../razvertyvanie-i-obnovlenie-n8n/SKILL.md)
- [Векторизация и загрузка базы](../vektorizaciya-i-zagruzka-bazy/SKILL.md)
- [Подключение отдела продаж](../podklyuchenie-otdela-prodazh/SKILL.md)
- [Telegram-тестирование бота](../telegram-testirovanie-bota/SKILL.md)

AmoCRM этапы:
- [AmoCRM и CRM-оператор](references/amocrm-crm-operator.md)
- [Команды для этапа AmoCRM](references/amocrm-commands.md)

Canonical prompt layer:
- [Prompt Architecture](../prompt-architecture/README.md)

## Обязательный режим работы

Для всех команд ниже действуют жесткие правила:
- локально не делать полный `git clone` репозитория без необходимости;
- для установки навыков и шаблонов скачивать только папку `skills/`;
- stack-папки скачивать отдельно и только по месту, когда до них реально дошел сценарий:
  - `n8n-stack-v2` — только на этапе `n8n`;
  - `supabase-stack` — только на этапе `Supabase`;
- дальше работать только с нужными локальными файлами, а не с полным зеркалом репозитория;
- не открывать браузер для поиска инструкций;
- не использовать интернет как источник шагов или шаблонов;
- не сочинять `DANNYE_DLYA_RAZVERTYVANIYA.md` и `KONTEXT_VNEDRENIYA_OTDELA_PRODAZH.md` с нуля;
- если файла нет, создавать его только копированием шаблона из репозитория;
- если файл есть, обновлять существующий, а не перезаписывать произвольной новой версией.

Шаблоны брать строго отсюда:
- `skills/DANNYE_DLYA_RAZVERTYVANIYA.md`
- `skills/KONTEXT_VNEDRENIYA_OTDELA_PRODAZH.md`
- `skills/RHYTHM_VNEDRENIYA_OTDELA_PRODAZH.md`

## Как агент должен вести пользователя

После каждого этапа агент должен:
- проверить текущее состояние;
- обновить общий файл контекста;
- понять, какой шаг уже выполнен;
- пропустить уже готовые этапы;
- взять следующий шаг из `RHYTHM_VNEDRENIYA_OTDELA_PRODAZH.md`;
- предложить только один следующий шаг;
- выдать этот шаг в готовом `text`-блоке;
- если есть достаточно данных, предложить продолжить без лишнего ввода;
- после Telegram-тестирования предложить сборку `brief`;
- после сборки `brief` предложить сборку промпта квалификатора;
- после промпта квалификатора предложить сборку промпта консультанта;
- после финального sales-теста, если пользователь хочет подключить AmoCRM, предложить `Снятие структуры AmoCRM`;
- после снятия структуры AmoCRM предложить `Сборка CRM-карты AmoCRM`;
- после CRM-карты предложить `Сборка AmoCRM-промптов и workflow`;
- после сборки AmoCRM workflow предложить `AmoCRM sales-тест`.

## Команда 1. Установить навык и сразу начать сценарий

Эта команда ставит сам навык-оркестратор и сразу запускает общий сценарий.
Агент прочитает входные данные, создаст или обновит файл контекста и сам предложит первый нужный этап.

```text
Сначала поставь навык одной командой (без ручной раскладки файлов):

`curl -sSL https://raw.githubusercontent.com/Comandosai/comandos-deploy-hub/main/tools/skills.sh | bash -s -- install polnyy-zapusk-otdela-prodazh --client codex`

Если работаешь в Claude, замени `codex` на `claude`.
Если работаешь в Gemini, замени `codex` на `gemini`.
Если работаешь в Antigravity, замени `codex` на `antigravity`.

Не делай полный `git clone`, если в этом шаге это не нужно.
Stack-папки заранее не скачивай:
- `n8n-stack-v2` нужен только на этапе `n8n`;
- `supabase-stack` нужен только на этапе `Supabase`.

После этого работай только с локальной папкой `skills/`.
Не открывай браузер и не ищи инструкции в интернете.

Проверь, что папка навыка появилась локально и доступна агенту.

Сначала:
- в корне проекта проверь `DANNYE_DLYA_RAZVERTYVANIYA.md` и `KONTEXT_VNEDRENIYA_OTDELA_PRODAZH.md`;
- если `DANNYE_DLYA_RAZVERTYVANIYA.md` отсутствует, скопируй шаблон из `skills/DANNYE_DLYA_RAZVERTYVANIYA.md` без сокращений;
- если `KONTEXT_VNEDRENIYA_OTDELA_PRODAZH.md` отсутствует, скопируй шаблон из `skills/KONTEXT_VNEDRENIYA_OTDELA_PRODAZH.md`;
- не создавай эти файлы вручную по памяти и не пиши произвольные поля;
- определи, какие этапы уже выполнены;
- не заставляй меня вручную выбирать следующий шаг.

После этого:
- предложи только один следующий релевантный этап;
- выдай его в готовом `text`-блоке;
- если можно продолжать автоматически, прямо предложи это;
- веди меня по цепочке:
  - `n8n`
  - `Supabase`
  - векторизация
  - подключение отдела продаж
  - Telegram-тестирование
  - `brief`
  - промпт квалификатора
  - промпт консультанта
```

## Команда 2. Установить или обновить `n8n`

Эта команда проверяет сервер, ищет существующий `n8n` и решает, что делать дальше.
Если `n8n` уже есть, агент предложит обновление; если нет, развернет новый экземпляр.

```text
Используй навык `Полный запуск отдела продаж`.

Не ищи инструкции по `n8n` в интернете.
Работай только через навыки из репозитория `https://github.com/Comandosai/comandos-deploy-hub`.
Для установки или обновления используй именно `n8n-stack-v2` из этого репозитория.
Не используй старый `n8n-stack` и не собирай `n8n` по сторонним инструкциям.

Начни с этапа `Развертывание и обновление n8n`.
Если поднавык еще не установлен, поставь его одной командой:
`curl -sSL https://raw.githubusercontent.com/Comandosai/comandos-deploy-hub/main/tools/skills.sh | bash -s -- install razvertyvanie-i-obnovlenie-n8n --client codex`
Если этап реально требует stack, скачивай только соответствующую stack-папку на сервер или в рабочую директорию этого этапа.
Если `n8n` уже найден на сервере, не ставь заново, а предложи обновление.
Если `n8n` не найден, разверни новый.

Если не хватает входных данных, прочитай `DANNYE_DLYA_RAZVERTYVANIYA.md` и спроси только недостающее.
После завершения обнови контекст проекта и предложи следующий шаг.
```

## Команда 3. Поднять или подключить `Supabase`

Эта команда проверяет, есть ли уже `Supabase`, и либо подключает найденный проект, либо разворачивает новый.
После завершения агент обязан показать URL, логин, пароль и параметры базы и сохранить их в файл данных.

```text
Используй навык `Полный запуск отдела продаж`.

Перейди к этапу `Supabase`.
Если `Supabase` уже найден, не развертывай его заново.
Если `Supabase` не найден, разверни новый и подготовь его для дальнейшей векторизации.

После завершения:
- покажи URL или dashboard URL;
- покажи логин или admin email;
- покажи пароль;
- покажи `db_host`, `db_port`, `db_name`, `db_user`, `db_schema`;
- запиши эти данные в `DANNYE_DLYA_RAZVERTYVANIYA.md`;
- обнови `KONTEXT_VNEDRENIYA_OTDELA_PRODAZH.md`;
- предложи следующий шаг.
```

## Команда 4. Подготовить документы к векторизации

Эта команда приводит документы к рабочему виду, но не запускает runner и не пишет данные в `Supabase`.
После подготовки агент обязан остановиться и показать, что готово к проверке.

```text
Используй навык `Полный запуск отдела продаж`.

Перейди к этапу `Подготовка документов к векторизации`.
Если поднавык еще не установлен, поставь его одной командой:
`curl -sSL https://raw.githubusercontent.com/Comandosai/comandos-deploy-hub/main/tools/skills.sh | bash -s -- install vektorizaciya-i-zagruzka-bazy --client codex`
Если `Supabase` нужно разворачивать с нуля, отдельно скачай только `supabase-stack`, а не весь репозиторий.

Сначала проверь, есть ли папка `Base/`.
Если `Base/` нет, не считай документы готовыми к векторизации, даже если в проекте есть `bd/` или другие уже очищенные файлы.
В этом случае сначала создай:
- `Base/`
- `Base/new_files/`
- `Base/prepared_docs/`
- `Base/vectorized_docs/`
- `Base/processed/`
- `Base/state/`

Только после этого переходи к подготовке документов.
Runner, ingestion, commandos-api и запись в `Supabase` на этом шаге не запускай.

Используй текущие данные проекта, `DANNYE_DLYA_RAZVERTYVANIYA.md` и текущую структуру `Base/`.

После завершения:
- покажи, создана ли `Base/`;
- покажи, сколько документов обработано;
- покажи, какие файлы ушли из `Base/new_files/`;
- покажи, что лежит в `Base/prepared_docs/`;
- покажи, создан ли `products_live.tsv`;
- покажи, создан ли `products_live_readable.md`;
- покажи manifest/status из `Base/state/`;
- обнови контекст проекта;
- предложи следующий шаг: запуск runner / ingestion.
```

## Команда 5. Запустить runner и загрузить данные в `Supabase`

Эта команда запускает второй этап: отправляет уже подготовленные документы из `Base/prepared_docs` в runtime, получает chunks/embeddings и записывает результат в `Supabase`.
Использовать только после проверки подготовленных документов.

```text
Используй навык `Полный запуск отдела продаж`.

Перейди к этапу `Запуск runner и загрузка базы`.
Если поднавык еще не установлен, поставь его одной командой:
`curl -sSL https://raw.githubusercontent.com/Comandosai/comandos-deploy-hub/main/tools/skills.sh | bash -s -- install vektorizaciya-i-zagruzka-bazy --client codex`

Перед запуском проверь:
- есть ли `Base/prepared_docs/`;
- есть ли подготовленные документы;
- есть ли `products_live.tsv`, если товарная таблица нужна;
- есть ли доступы к `Supabase`;
- есть ли `x-license-key` (или `x_license_key`, если в проекте ключ хранится со старым именем);
- есть ли `supabase_service_role_key`, если нужен Supabase credential.

Запусти runner / ingestion только сейчас.

После завершения:
- покажи, сколько документов отправлено;
- сколько чанков записано в `knowledge_rag`;
- сколько строк записано в `products_live`;
- какие файлы перенесены в `Base/vectorized_docs`;
- очищен ли `Base/prepared_docs`;
- обнови контекст проекта;
- предложи следующий шаг.
```

## Команда 6. Подключить отдел продаж

Эта команда связывает `n8n`, `Supabase`, `MCP`, workflow и credentials в один рабочий контур.
На этом шаге агент должен импортировать workflow, создать недостающие соединения и проверить, что все связано корректно.
При первом разворачивании агент должен активировать только тестовый workflow `06_WF_Test` и workflow `Уведомления об ошибках в N8N`.
Боевые workflow отдела продаж должны остаться выключенными до отдельной команды на боевой запуск.

```text
Используй навык `Полный запуск отдела продаж`.

Перейди к этапу `Подключение отдела продаж`.
Если поднавык еще не установлен, поставь его одной командой:
`curl -sSL https://raw.githubusercontent.com/Comandosai/comandos-deploy-hub/main/tools/skills.sh | bash -s -- install podklyuchenie-otdela-prodazh --client codex`

Подключи `n8n`, `Supabase`, `MCP`, workflow и credentials.
Если нужных секретов не хватает, сначала прочитай `DANNYE_DLYA_RAZVERTYVANIYA.md`, а потом спроси только недостающие поля.

Правило активации при первом разворачивании:
- активируй или опубликуй `06_WF_Test`;
- активируй или опубликуй `Уведомления об ошибках в N8N` с credential из `telegram_error_bot_token`;
- не активируй боевые workflow `01_Ingress_Channel_Intake`, `02_Main_Orcestrator`, `03_WF_Qualification`, `04_WF_Consultation`, `05_WF_Human_Handoff_Workflow`;
- боевой запуск делать только после теста базы знаний и отдельной команды пользователя.

После завершения:
- обнови контекст проекта;
- покажи, какие workflow подключены;
- покажи, что активны только `06_WF_Test` и `Уведомления об ошибках в N8N`, а боевые workflow выключены;
- покажи, какие credentials созданы;
- предложи следующий шаг.
```

## Команда 7. Протестировать бота в Telegram

Эта команда запускает тесты живого бота в Telegram.
Агент сначала обязан проверить, что тестовый workflow `06_WF_Test` реально активирован. Если в текущей версии `n8n` используется публикация, он должен сделать `publish`; если используется старый режим, он должен включить `Active`. Только после этого запускать Telegram-тесты.

```text
Используй навык `Полный запуск отдела продаж`.

Перейди к этапу `Telegram-тестирование бота`.
Если поднавык еще не установлен, поставь его одной командой:
`curl -sSL https://raw.githubusercontent.com/Comandosai/comandos-deploy-hub/main/tools/skills.sh | bash -s -- install telegram-testirovanie-bota --client codex`

Перед тестами:
- найди workflow `06_WF_Test`;
- если он не активен, активируй его;
- если в этой версии `n8n` нужен `publish`, опубликуй workflow;
- не начинай Telegram-тестирование, пока тестовый workflow не переведен в рабочее состояние.
- перед новым прогоном сначала очисти базу:
  - очисти все рабочие тестовые данные прошлого прогона;
  - не трогай только `knowledge_rag` и `products_live`;
  - после очистки сразу переходи к тесту.

Проведи тестовый прогон, используя текущий контекст проекта.
Если не хватает Telegram-данных, сначала проверь `DANNYE_DLYA_RAZVERTYVANIYA.md`, потом спроси только недостающее.

Режим отчета:
- используй `report_mode = knowledge_base_test`;
- сохрани raw dialog report;
- сохрани normalized summary report;
- в summary оцени не sales prompt-ы, а качество базы: `knowledge_rag`, `products_live`, точность фактов, пробелы в документах, ошибки по ценам/офферам/товарам и ожидаемые изменения к следующему прогону.

После завершения:
- обнови контекст проекта;
- зафиксируй, был ли тестовый workflow активирован или опубликован;
- покажи краткий summary по тесту базы;
- предложи следующий шаг.
```

## Команда 8. Собрать `brief`

Эта команда собирает единый `brief` из документов, базы знаний и `products_live`.
Именно этот `brief` потом используется как основа для системных промптов.

```text
Используй навык `Полный запуск отдела продаж`.

Перейди к этапу `Сборка brief`.
Используй навык `Сборка брифа`.
Собери `brief` и `Prompt Input Profile` на основе документов, `products_live` и базы знаний.

После завершения:
- покажи, где сохранен `brief`;
- покажи, где сохранен `Prompt Input Profile`;
- обнови контекст проекта;
- предложи следующий шаг.
```

## Команда 9. Собрать промпт квалификатора

Эта команда создает системный промпт квалификатора на основе готового `brief`.
Результат нужен для агента, который квалифицирует лида, задает вопросы и двигает его дальше по воронке.

```text
Используй навык `Полный запуск отдела продаж`.

Перейди к этапу `Промпт квалификатора`.
Используй навык `Промпт квалификатора`.
Собери production-ready системный промпт квалификатора через canonical layer, а не из workflow JSON и не из свободной генерации.

Обязательно используй:
- готовый `brief`
- готовый `Prompt Input Profile`
- `skills/units/prompt-kvalifikatora/SKILL.md`
- `skills/units/prompt-kvalifikatora/references/sdr-role-contract.md`
- `skills/units/prompt-kvalifikatora/references/sdr-db-and-crm.md`
- `skills/prompt-architecture/templates/SDR_QUALIFIER_SKELETON.md`
- `skills/prompt-architecture/references/PROMPT_BUILDER_CONTRACT.md`
- `skills/prompt-architecture/references/MATURE_SDR_QUALIFIER_BASELINE.md`

Сначала:
- прочитай `skills/units/prompt-kvalifikatora/SKILL.md`;
- прочитай `skills/units/prompt-kvalifikatora/references/sdr-role-contract.md`;
- прочитай `skills/units/prompt-kvalifikatora/references/sdr-db-and-crm.md`;
- прочитай `skills/prompt-architecture/templates/SDR_QUALIFIER_SKELETON.md`;
- прочитай `skills/prompt-architecture/references/PROMPT_BUILDER_CONTRACT.md`;
- прочитай `skills/prompt-architecture/references/MATURE_SDR_QUALIFIER_BASELINE.md`;
- только после этого прочитай project документы, `brief` и `Prompt Input Profile`;
- сначала собери в голове полный project contract, а не начинай сразу писать итоговый prompt;
- проверь, есть ли `Prompts/qualifier_input_profile.json`;
- если его нет, собери его как отдельный артефакт;
- не перескакивай сразу к финальному prompt без input profile.

Потом:
- собери и сохрани итоговый prompt как `Prompts/prompt_qualifier.md`.

Жесткие правила:
- использовать только роль `sdr_qualifier`, а не `consultant` и не `interviewer`;
- не разрешать `products_live` lookup, `exact_match`, `relaxed_match`, `category_browse`;
- не использовать consultant-style behavior;
- не выдумывать DB contract;
- использовать только confirmed safe DB write contract;
- использовать fixed JSON output contract;
- не сокращать prompt до короткой contract-версии;
- не делать draft prompt на 80-150 строк, если можно собрать полный production prompt;
- не пересказывать reference-файлы коротко, если из них можно перенести полноразмерные operational blocks;
- сначала перенести зрелые rule blocks из reference и baseline, а уже потом адаптировать их под проект;
- отдельно прописать orientation-first rule, completion threshold, post-consultation handoff mode, DB rules, forbidden actions, strict output discipline.
- На текущем этапе CRM не включать в prompt вообще: если нет отдельной явной команды на CRM-интеграцию, итоговый prompt не должен содержать `CRM`, `AMO`, `AmoCRM`, `MCP CRM`, `MCP AmoCRM` или `skip CRM`.
- если в проекте есть `MCP Postgres` lead write-back path, обязательно явно прописать `public.update_lead_profile_safe(...)`, allowed params и sequencing persistence;
- наличие `MCP Postgres` в инструментах без explicit DB write-back layer считать ошибкой сборки prompt.

Требование к качеству:
- prompt должен быть production-ready;
- prompt должен быть длинным, полным, с явными блоками role, goal, scope, data sources, routing, DB rules, dialog policy, output contract, status machine, anti-patterns, final self-check;
- prompt должен содержать explicit safe DB contract, если проект использует persisted lead memory;
- prompt должен быть собран после чтения reference -> skeleton -> baseline -> project docs -> brief/profile, а не в обратном порядке;
- ориентир — полноценный системный prompt на несколько сотен строк, а не короткий contract.

После завершения:
- покажи, где сохранен промпт;
- покажи, где сохранен input profile;
- обнови контекст проекта;
- предложи следующий шаг.
```

## Команда 10. Собрать промпт консультанта

Эта команда создает системный промпт консультанта на основе готового `brief` и уже собранного промпта квалификатора.
Результат нужен для продуктового консультанта, который отвечает с опорой на знания и товарную таблицу, не дублирует квалификатора и не ломает границы роли.

```text
Используй навык `Полный запуск отдела продаж`.

Перейди к этапу `Промпт консультанта`.
Используй навык `Промпт консультанта`.
Собери production-ready системный промпт консультанта через canonical layer, а не из workflow JSON и не из свободной генерации.

Обязательно используй:
- готовый `brief`
- готовый `Prompt Input Profile`
- уже готовый `Prompts/prompt_qualifier.md`
- `skills/units/prompt-konsultanta/SKILL.md`
- `skills/units/prompt-konsultanta/references/consultant-role-contract.md`
- `skills/units/prompt-konsultanta/references/consultant-live-search.md`
- `skills/prompt-architecture/templates/CONSULTANT_SKELETON.md`
- `skills/prompt-architecture/references/PROMPT_BUILDER_CONTRACT.md`
- `skills/prompt-architecture/references/MATURE_CONSULTANT_BASELINE.md`

Сначала:
- прочитай `skills/units/prompt-konsultanta/SKILL.md`;
- прочитай `skills/units/prompt-konsultanta/references/consultant-role-contract.md`;
- прочитай `skills/units/prompt-konsultanta/references/consultant-live-search.md`;
- прочитай `skills/prompt-architecture/templates/CONSULTANT_SKELETON.md`;
- прочитай `skills/prompt-architecture/references/PROMPT_BUILDER_CONTRACT.md`;
- прочитай `skills/prompt-architecture/references/MATURE_CONSULTANT_BASELINE.md`;
- только после этого прочитай project документы, `brief`, `Prompt Input Profile` и уже готовый `Prompts/prompt_qualifier.md`;
- сначала собери в голове полный project-specific consultant contract, и только потом переходи к финальному prompt;
- проверь, есть ли `Prompts/consultant_input_profile.json`;
- если его нет, собери его как отдельный артефакт;
- не перескакивай сразу к финальному prompt без input profile.
- проверь, что уже существует `Prompts/prompt_qualifier.md`;
- если промпта квалификатора еще нет, не собирай prompt консультанта и сначала вернись к этапу квалификатора.

Потом:
- собери и сохрани итоговый prompt как `Prompts/prompt_consultant.md`.

Жесткие правила:
- не использовать workflow JSON как источник prompt-смысла;
- не генерировать prompt напрямую из `brief` без skeleton-layer;
- не сокращать prompt до короткой contract-версии;
- не делать draft prompt на 80-150 строк, если можно собрать полный production prompt;
- не пересказывать reference-файлы коротко, если из них можно перенести полноразмерные operational blocks;
- сначала перенести в prompt зрелые project-specific rule blocks из baseline и references, а уже потом адаптировать под текущий проект;
- сохранить role boundary между consultant, qualifier и handoff;
- учитывать уже собранный prompt квалификатора и не дублировать в prompt консультанта логику первичной qualification intake;
- явно описать source ordering: knowledge -> product_memory (если есть) -> live;
- явно описать live-search rules, anti-hallucination rules, handoff rules, output/state contract.
- если в проекте подтвержден `MCP Postgres` write-back path, обязательно явно описать `Write-back and memory`;
- нельзя выпускать consultant prompt, если в нем нет `consultation_summary` discipline и safe lead-profile write-back логики;
- наличие `MCP Postgres` в инструментах без логики записи в лид-профиль считать ошибкой сборки prompt.

Требование к качеству:
- prompt должен быть production-ready;
- prompt должен быть длинным, полным, с явными блоками роли, scope, data sources, routing, tool usage, live rules, fallback, dialog policy, output contract, forbidden actions;
- prompt должен содержать explicit write-back layer, если проект использует persisted lead memory;
- prompt должен быть собран после чтения reference -> skeleton -> baseline -> project docs -> brief/profile -> qualifier prompt, а не из одного `brief`;
- ориентир — полноценный системный prompt, а не короткий skeleton fill.

После завершения:
- покажи, где сохранен промпт;
- покажи, где сохранен input profile;
- обнови контекст проекта;
- предложи следующий шаг.
```

## Команда 11. Вставить prompt-ы в боевые workflow

Эта команда не генерирует prompt-ы заново.
Она берет уже готовые production prompt-артефакты и вставляет их в соответствующие AI-узлы боевых workflow в живом `n8n`.

```text
Используй навык `Полный запуск отдела продаж`.

Перейди к этапу `Вставка prompt-ов в workflow`.

Сначала проверь, что уже существуют:
- `Prompts/prompt_consultant.md`
- `Prompts/prompt_qualifier.md`

Если хотя бы одного файла нет:
- не вставляй ничего в workflow;
- сначала вернись к этапу сборки недостающего prompt-а.

Если оба prompt-а есть, выполни следующее:

1. Возьми `Prompts/prompt_qualifier.md`.
2. Найди в боевом workflow `03_WF_Qualification` AI-узел `AI Квалификатор`.
3. Вставь содержимое `Prompts/prompt_qualifier.md` в `options.systemMessage` этого AI-узла в живом `n8n`.

4. Возьми `Prompts/prompt_consultant.md`.
5. Найди в боевом workflow `04_WF_Consultation` AI-узел `Consultation`.
6. Вставь содержимое `Prompts/prompt_consultant.md` в `options.systemMessage` этого AI-узла в живом `n8n`.

Важные правила:
- не использовать workflow JSON как source of truth для prompt-ов;
- source of truth для prompt-ов должен оставаться в `Prompts/`;
- при вставке обновлять prompt не только в draft workflow, но и в active/published version, если workflow уже опубликован;
- не вставлять prompt в тестовый workflow вместо боевых workflow;
- не вставлять qualifier prompt в consultant workflow;
- не вставлять consultant prompt в qualifier workflow.

После вставки обязательно проверь:
- что в `03_WF_Qualification` реально стоит prompt квалификатора;
- что в `04_WF_Consultation` реально стоит prompt консультанта;
- что prompt присутствует и в текущем draft, и в active/published version;
- что workflow после этого не потеряли свои connections, tools и credentials.

После завершения:
- покажи, в какие workflow и в какие AI-узлы вставлены prompt-ы;
- покажи, что вставка прошла успешно;
- обнови контекст проекта;
- предложи следующий шаг: `Финальное тестирование отдела продаж`.
```

## Команда 12. Запустить боевые тесты отдела продаж

Эта команда запускает уже не проверку базы знаний, а полноценное тестирование рабочего sales-контура.
Её нужно использовать после того, как вставлены `brief`, промпт консультанта и промпт квалификатора, и нужно проверить, как связка реально отрабатывает в диалоге.

```text
Используй навык `Полный запуск отдела продаж`.

Перейди к этапу `Финальное тестирование отдела продаж`.

Сначала проверь:
- что `brief` уже собран и сохранен;
- что промпт консультанта уже вставлен в нужный workflow или узел;
- что промпт квалификатора уже вставлен в нужный workflow или узел;
- что все нужные workflow активированы или опубликованы;
- что тестовый режим базы знаний уже пройден;
- что тестовый workflow `06_WF_Test` выключен или снят с публикации;
- если `06_WF_Test` еще активен, сначала выключи его, проверь, что тестовый триггер больше не слушает входящие сообщения, и только потом переходи к боевому прогону.
- перед новым sales-прогоном сначала очисти базу:
  - очисти все рабочие тестовые данные прошлого прогона;
  - не трогай только `knowledge_rag` и `products_live`;
  - после очистки сразу переходи к финальному тесту.

После этого запусти именно тестирование отдела продаж, а не тестирование только базы знаний.

Режим отчета:
- используй `report_mode = sales_final_test`;
- сохрани raw dialog report отдельно;
- сохрани normalized summary report отдельно;
- raw dialog без summary не считать завершенным финальным тестом.

Нужно проверить:
- квалификацию лида;
- переход между квалификатором и консультантом;
- использование базы знаний и `products_live` в ответах;
- корректность ответов по продуктам, ценам и офферам;
- работу handoff-сценариев;
- где контур отвечает сам, а где упирается в `MCP`, credentials или workflow-связки.

Проведи серию живых тестов и после завершения:
- сохрани итоговый отчет;
- в summary отдельно покажи работу prompt-ов, агентов, routing, handoff, повторяемость, занудство, phone-gate и утечки служебных сообщений;
- добавь `expected_changes_next_run`, чтобы после правок было видно, что должно измениться;
- отдельно зафиксируй, что `06_WF_Test` был выключен перед боевым прогоном;
- отдельно покажи критические ошибки;
- отдельно покажи, что нужно исправить перед боевым запуском;
- обнови `KONTEXT_VNEDRENIYA_OTDELA_PRODAZH.md`;
- предложи только один следующий шаг.
```

## Команда 13. Снять структуру AmoCRM

См. полный текст команды в [Команды для этапа AmoCRM](references/amocrm-commands.md#команда-13-снять-структуру-amocrm).

```text
Используй навык `Полный запуск отдела продаж`.

Перейди к этапу `Снятие структуры AmoCRM`.

Проверь доступ к `MCP AmoCRM`, получи воронки, стадии, поля контакта, поля сделки если доступны, доступные действия MCP. Запиши найденную структуру в `DANNYE_DLYA_RAZVERTYVANIYA.md`, обнови контекст и предложи следующий шаг: `Сборка CRM-карты AmoCRM`.
```

## Команда 14. Собрать CRM-карту AmoCRM

См. полный текст команды в [Команды для этапа AmoCRM](references/amocrm-commands.md#команда-14-собрать-crm-карту-amocrm).

```text
Используй навык `Полный запуск отдела продаж`.

Перейди к этапу `Сборка CRM-карты AmoCRM`.

Покажи пользователю найденные стадии и поля, попроси подтвердить правила движения по воронке и правила заполнения полей. Сохрани карту в `Prompts/amocrm_crm_map.json`, `AmoCRM_skill/WORKLOG.md` и `DANNYE_DLYA_RAZVERTYVANIYA.md`. Обнови контекст и предложи следующий шаг: `Сборка AmoCRM-промптов и workflow`.
```

## Команда 15. Собрать AmoCRM-промпты и workflow

См. полный текст команды в [Команды для этапа AmoCRM](references/amocrm-commands.md#команда-15-собрать-amocrm-промпты-и-workflow).

```text
Используй навык `Полный запуск отдела продаж`.

Перейди к этапу `Сборка AmoCRM-промптов и workflow`.

На основе `Prompts/amocrm_crm_map.json` обнови `Prompts/prompt_orchestrator_crm_operator.md`, prompt AI-узла `CRM Operator` в `07_WF_CRM_Operato`, при необходимости промпты квалификатора и консультанта, а также handoff prompt. Проверь, что оркестратор вызывает `crm_operator`, а `MCP AmoCRM` не подключен к оркестратору напрямую. Обнови контекст и предложи следующий шаг: `AmoCRM sales-тест`.
```

## Команда 16. AmoCRM sales-тест

См. полный текст команды в [Команды для этапа AmoCRM](references/amocrm-commands.md#команда-16-amocrm-sales-тест).

```text
Используй навык `Полный запуск отдела продаж`.

Перейди к этапу `AmoCRM sales-тест`.

Проверь `07_WF_CRM_Operato`, очисти рабочие таблицы Supabase без `knowledge_rag` и `products_live`, запусти живой sales-тест, проверь `crm_sync`, заполнение полей AmoCRM, движение сделки, handoff, заметку и задачу. Сохрани raw и summary report, обнови контекст и предложи следующий шаг: `Точечная правка prompt-ов по итогам AmoCRM-теста`.
```
