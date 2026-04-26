# Полный запуск отдела продаж

Это верхнеуровневый навык, который ведет пользователя через весь сценарий внедрения как через один проект.
Источник шагов для запуска: разделы `Команда 1..16` в этом `README.md`.

Что делает:
- читает общий файл входных данных проекта;
- читает общий файл контекста внедрения;
- понимает, что уже готово;
- определяет следующий релевантный этап;
- предлагает только один следующий шаг;
- направляет пользователя в нужный поднавык;
- после завершения этапа обновляет контекст и ведет дальше.

## Короткий порядок

1. Установить навык `Полный запуск отдела продаж`.
2. Установить или обновить `n8n`.
3. Найти или поднять `Supabase`.
4. Подготовить документы.
5. Загрузить документы в базу.
6. Подключить отдел продаж.
7. Протестировать бота в Telegram.
8. Собрать `brief`.
9. Собрать промпт квалификатора.
10. Собрать промпт консультанта.
11. Вставить промпты в боевые `workflow`.
12. Провести финальное тестирование.
13. Снять структуру `AmoCRM`.
14. Собрать CRM-карту `AmoCRM`.
15. Собрать `AmoCRM`-промпты и workflow.
16. Провести `AmoCRM` sales-тест.

Полный порядок не переставлять без причины.

## Когда использовать

Использовать, когда нужно вести весь проект как единый сценарий:
- `n8n`
- база знаний и векторизация
- подключение отдела продаж
- Telegram-тестирование
- сборка `brief`
- сборка промптов
- подключение `AmoCRM`

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
- stack-папки скачивать отдельно и только по месту, когда до них реально дошел сценарий;
- не открывать браузер для поиска инструкций;
- не использовать интернет как источник шагов или шаблонов;
- не подключаться по `SSH` к серверу, где живет `MCP`-узел, `MCP`-контейнер или чужая служебная машина;
- не заходить вручную в контейнеры `MCP` ради разведки структуры `AmoCRM`;
- все проверки и работа по `AmoCRM` должны идти через клиентский `n8n` и клиентский `MCP AmoCRM`;
- не сочинять `DANNYE_DLYA_RAZVERTYVANIYA.md` и `KONTEXT_VNEDRENIYA_OTDELA_PRODAZH.md` с нуля;
- если файла нет, создавать его только копированием шаблона из репозитория;
- если файл есть, обновлять существующий, а не переписывать случайной новой версией.

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
- после Telegram-тестирования предложить сборку `brief`;
- после `brief` предложить промпт квалификатора;
- после квалификатора предложить промпт консультанта;
- после финального sales-теста, если пользователь идет дальше в CRM, предложить `Снятие структуры AmoCRM`;
- после CRM-карты предложить `Сборка AmoCRM-промптов и workflow`;
- после сборки CRM workflow предложить `AmoCRM sales-тест`.

## Команда 1. Установить навык и сразу начать сценарий

```text
Установи навык одной командой:
`curl -sSL https://raw.githubusercontent.com/Comandosai/comandos-deploy-hub/main/tools/skills.sh | bash -s -- install polnyy-zapusk-otdela-prodazh --client codex`

Потом работай только через:
- `skills/bundles/polnyy-zapusk-otdela-prodazh/SKILL.md`
- `skills/bundles/polnyy-zapusk-otdela-prodazh/README.md`

Сначала проверь:
- `DANNYE_DLYA_RAZVERTYVANIYA.md`
- `KONTEXT_VNEDRENIYA_OTDELA_PRODAZH.md`

Если файлов нет, копируй шаблоны из `skills/`.
Не открывай браузер.
Не скачивай весь репозиторий.
Сам определи следующий этап и предложи только один следующий шаг.
```

## Команда 2. Установить или обновить `n8n`

```text
Используй навык `Полный запуск отдела продаж`.

Начни с этапа `Развертывание и обновление n8n`.
Смотри правила только в:
- `skills/units/razvertyvanie-i-obnovlenie-n8n/SKILL.md`
- `skills/bundles/polnyy-zapusk-otdela-prodazh/SKILL.md`

Не ищи внешние инструкции.
Не используй старый `n8n-stack`.
Если `n8n` уже найден, обнови.
Если не найден, разверни.
Сначала читай `DANNYE_DLYA_RAZVERTYVANIYA.md`, потом спрашивай только недостающее.
Обнови контекст и предложи следующий шаг.
```

## Команда 3. Поднять или подключить `Supabase`

```text
Используй навык `Полный запуск отдела продаж`.

Перейди к этапу `Supabase`.
Смотри правила только в:
- `skills/vektorizaciya-i-zagruzka-bazy/SKILL.md`
- `skills/bundles/polnyy-zapusk-otdela-prodazh/SKILL.md`

Если `Supabase` уже найден, не разворачивай его заново.
Если не найден, разверни.
Покажи URL, логин, пароль и параметры базы.
Запиши их в `DANNYE_DLYA_RAZVERTYVANIYA.md`.
Обнови контекст и предложи следующий шаг.
```

## Команда 4. Подготовить документы к векторизации

```text
Используй навык `Полный запуск отдела продаж`.

Перейди к этапу `Подготовка документов к векторизации`.
Смотри правила только в:
- `skills/vektorizaciya-i-zagruzka-bazy/SKILL.md`
- `skills/vektorizaciya-i-zagruzka-bazy/skills/doc-splitter-launcher/SKILL.md`
- `skills/vektorizaciya-i-zagruzka-bazy/skills/doc-splitter/SKILL.md`

Сначала проверь структуру `Base/`.
Если `Base/` нет, создай её по канону.
На этом шаге только подготовка документов.
Runner и загрузку в `Supabase` не запускай.
Покажи, что подготовлено, обнови контекст и предложи следующий шаг.
```

## Команда 5. Запустить runner и загрузить данные в `Supabase`

```text
Используй навык `Полный запуск отдела продаж`.

Перейди к этапу `Запуск runner и загрузка базы`.
Смотри правила только в:
- `skills/vektorizaciya-i-zagruzka-bazy/SKILL.md`
- `skills/vektorizaciya-i-zagruzka-bazy/skills/vector-ingestion-launcher/SKILL.md`

Перед запуском проверь:
- `Base/prepared_docs/`
- доступы к `Supabase`
- `x_license_key`
- `supabase_service_role_key`

Запусти только runner и загрузку.
Покажи, сколько ушло в `knowledge_rag` и `products_live`.
Обнови контекст и предложи следующий шаг.
```

## Команда 6. Подключить отдел продаж

```text
Используй навык `Полный запуск отдела продаж`.

Перейди к этапу `Подключение отдела продаж`.
Смотри правила только в:
- `skills/bundles/podklyuchenie-otdela-prodazh/SKILL.md`
- `skills/bundles/podklyuchenie-otdela-prodazh/README.md`

Сделай:
- импорт workflow;
- создание и перепривязку credentials;
- настройку `MCP Postgres`, `MCP AmoCRM`, `Supabase`, `Postgres`, `Telegram`, `OpenAI/OpenRouter`, если они нужны;
- аудит `credential.id` внутри узлов.

При первом разворачивании включай только:
- `06_WF_Test`
- `Уведомления об ошибках в N8N`

Боевые workflow, включая `07_WF_CRM_Operator`, пока не включай.
Покажи, что подключено, обнови контекст и предложи следующий шаг.
```

## Команда 7. Протестировать бота в Telegram

```text
Используй навык `Полный запуск отдела продаж`.

Перейди к этапу `Telegram-тестирование бота`.
Смотри правила только в:
- `skills/telegram-testirovanie-bota/SKILL.md`
- `skills/bundles/polnyy-zapusk-otdela-prodazh/SKILL.md`

Перед тестом:
- проверь, что `06_WF_Test` включен или опубликован;
- очисти рабочие тестовые данные, кроме `knowledge_rag` и `products_live`.

Запусти тест базы в Telegram.
Сохрани raw report и summary report.
Обнови контекст и предложи следующий шаг.
```

## Команда 8. Собрать `brief`

```text
Используй навык `Полный запуск отдела продаж`.

Перейди к этапу `Сборка brief`.
Используй навык `Сборка брифа`.
Смотри правила в:
- `skills/brief-builder/SKILL.md`
- `skills/bundles/polnyy-zapusk-otdela-prodazh/SKILL.md`

Собери `brief` и `Prompt Input Profile`.
Покажи, где они сохранены.
Обнови контекст и предложи следующий шаг.
```

## Команда 9. Собрать промпт квалификатора

```text
Используй навык `Полный запуск отдела продаж`.

Перейди к этапу `Промпт квалификатора`.
Используй навык `Промпт квалификатора`.
Смотри правила только в:
- `skills/units/prompt-kvalifikatora/SKILL.md`
- `skills/units/prompt-kvalifikatora/references/sdr-role-contract.md`
- `skills/units/prompt-kvalifikatora/references/sdr-db-and-crm.md`
- `skills/units/prompt-architecture/templates/SDR_QUALIFIER_SKELETON.md`
- `skills/units/prompt-architecture/references/PROMPT_BUILDER_CONTRACT.md`

Сначала собери `Prompts/qualifier_input_profile.json`, если его нет.
Потом собери `Prompts/prompt_qualifier.md`.
Не выдумывай output contract.
Для `03_WF_Qualification` используй только поля:
- `text_to_user`
- `status`
- `recommended_next_step`
- `result_summary`
- `is_qualified`

Запрещены любые переименования вроде `reply_to_user`.
Покажи, где сохранён prompt, обнови контекст и предложи следующий шаг.
```

## Команда 10. Собрать промпт консультанта

```text
Используй навык `Полный запуск отдела продаж`.

Перейди к этапу `Промпт консультанта`.
Используй навык `Промпт консультанта`.
Смотри правила только в:
- `skills/units/prompt-konsultanta/SKILL.md`
- `skills/units/prompt-konsultanta/references/consultant-role-contract.md`
- `skills/units/prompt-konsultanta/references/consultant-live-search.md`
- `skills/units/prompt-architecture/templates/CONSULTANT_SKELETON.md`
- `skills/units/prompt-architecture/references/PROMPT_BUILDER_CONTRACT.md`

Сначала проверь, что уже есть `Prompts/prompt_qualifier.md`.
Потом собери `Prompts/consultant_input_profile.json`, если его нет.
Потом собери `Prompts/prompt_consultant.md`.
Не выдумывай output contract.
Для `04_WF_Consultation` используй только поля:
- `text_to_user`
- `status`
- `recommended_next_step`
- `result_summary`

Запрещены любые переименования вроде `reply_to_user` и `consultation_status`.
Покажи, где сохранён prompt, обнови контекст и предложи следующий шаг.
```

## Команда 11. Вставить prompt-ы в боевые workflow

```text
Используй навык `Полный запуск отдела продаж`.

Перейди к этапу `Вставка prompt-ов в workflow`.
Смотри правила в:
- `skills/bundles/polnyy-zapusk-otdela-prodazh/README.md`
- `Prompts/prompt_qualifier.md`
- `Prompts/prompt_consultant.md`

Вставь:
- `prompt_qualifier.md` в `03_WF_Qualification` -> `AI Квалификатор`
- `prompt_consultant.md` в `04_WF_Consultation` -> `Consultation`

Обнови и draft, и active/published version, если она уже есть.
Проверь, что связи и credentials не сломались.
Обнови контекст и предложи следующий шаг.
```

## Команда 12. Запустить боевые тесты отдела продаж

```text
Используй навык `Полный запуск отдела продаж`.

Перейди к этапу `Финальное тестирование отдела продаж`.
Сначала проверь:
- `brief` уже собран;
- prompt-ы уже вставлены;
- боевые workflow уже включены;
- `06_WF_Test` выключен;
- `07_WF_CRM_Operator`, если он есть, тоже включён.

Потом запусти боевой тест.
Сохрани raw report и summary report.
Проверь квалификацию, консультацию, handoff, ответы по базе и работу `07_WF_CRM_Operator`, если он участвует в маршруте.
Обнови контекст и предложи только один следующий шаг.
```

## Команда 13. Снять структуру `AmoCRM`

```text
Используй навык `Полный запуск отдела продаж`.

Перейди к этапу `Снятие структуры AmoCRM`.
Смотри правила только в:
- `skills/bundles/polnyy-zapusk-otdela-prodazh/references/amocrm-commands.md`
- `skills/bundles/polnyy-zapusk-otdela-prodazh/references/amocrm-crm-operator.md`

Работай только через клиентский `n8n` и `MCP AmoCRM`.
Не ходи в `SSH`.
Не лезь в контейнер `MCP`.
Сначала сделай короткий проверочный вызов через `MCP AmoCRM`.
Потом сними воронки, статусы, поля и доступные действия.
Сохрани результат, обнови контекст и предложи следующий шаг.
```

## Команда 14. Собрать CRM-карту `AmoCRM`

```text
Используй навык `Полный запуск отдела продаж`.

Перейди к этапу `Сборка CRM-карты AmoCRM`.
Смотри правила только в:
- `skills/bundles/polnyy-zapusk-otdela-prodazh/references/amocrm-commands.md`
- `skills/bundles/polnyy-zapusk-otdela-prodazh/references/amocrm-crm-operator.md`

Возьми уже снятую структуру `AmoCRM`.
Собери по ней рабочую CRM-карту:
- воронка
- статусы
- поля
- правила создания и обновления контакта
- правила создания и обновления сделки
- что делает автоматика, а что остаётся человеку

Сохрани карту, обнови контекст и предложи следующий шаг.
```

## Команда 15. Собрать AmoCRM-промпты и workflow

```text
Используй навык `Полный запуск отдела продаж`.

Перейди к этапу `Сборка AmoCRM-промптов и workflow`.
Смотри правила только в:
- `skills/bundles/polnyy-zapusk-otdela-prodazh/references/amocrm-commands.md`
- `skills/bundles/polnyy-zapusk-otdela-prodazh/references/amocrm-crm-operator.md`

Работай от CRM-карты.
Обновляй только нужные prompt-ы и `07_WF_CRM_Operator`.
Не лезь в `SSH`.
Не втыкай `MCP AmoCRM` напрямую туда, где должен работать `CRM Operator`.
Покажи, что обновлено, обнови контекст и предложи следующий шаг.
```

## Команда 16. AmoCRM sales-тест

```text
Используй навык `Полный запуск отдела продаж`.

Перейди к этапу `AmoCRM sales-тест`.
Смотри правила только в:
- `skills/bundles/polnyy-zapusk-otdela-prodazh/references/amocrm-commands.md`
- `skills/bundles/polnyy-zapusk-otdela-prodazh/references/amocrm-crm-operator.md`

Проверь `07_WF_CRM_Operator`, prompt-ы и `MCP AmoCRM`.
Очисти рабочие тестовые данные.
Запусти живой тест CRM-ветки только как многошаговый диалог.
Сделай 5-8 разных сообщений от лица клиента по материалам компании.
Не повторяй один и тот же набор вопросов между прогонами.
Имитируй живого человека по-разному, чтобы вскрывать слабые места.
Проверь `crm_sync`, контакт, сделку, поля, статусы, handoff, заметку и задачу, если они есть в логике.
Сохрани raw и summary report.
Обнови контекст и предложи следующий шаг.
```
