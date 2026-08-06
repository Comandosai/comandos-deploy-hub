---
name: zapusk-otdela-prodazh-os
description: "Пакет запуска отдела продаж в COMANDOS ОС. Использовать, когда нужно провести клиента через hosted Hub/ОС без старого n8n-сценария: подключить Supabase, Telegram, amoCRM, базу знаний, собрать brief, промпты квалификатора, консультанта и CRM-оператора, вести LAUNCH_ROADMAP/LAUNCH_STATE и отмечать шаги запуска."
---

# Запуск отдела продаж ОС

Этот пакет ведет запуск отдела продаж внутри готовой COMANDOS ОС. Он не разворачивает старый n8n-контур у клиента.

## Первые действия

1. Прочитай [README.md](README.md).
2. Создай в рабочей папке клиента файлы:
   - `AGENTS.md` из [templates/AGENTS.template.md](templates/AGENTS.template.md);
   - `LAUNCH_ROADMAP.md` из [templates/LAUNCH_ROADMAP.template.md](templates/LAUNCH_ROADMAP.template.md);
   - `LAUNCH_STATE.json` из [templates/LAUNCH_STATE.template.json](templates/LAUNCH_STATE.template.json);
   - `PROJECT_NOTES.md` из [templates/PROJECT_NOTES.template.md](templates/PROJECT_NOTES.template.md).
3. После создания рабочих файлов остановись, объясни что готов только этап 0, и не запускай Supabase, Telegram, базу знаний, prompts, amoCRM, smoke-test или deploy без отдельной команды пользователя.
4. Обновляй roadmap/state/notes после каждого действия.
5. Не отмечай шаг выполненным, пока не проверен критерий готовности.
6. Если пользователь перескочил вперед, верни его к самому раннему незакрытому gate. Не выполняй поздний этап "в долг".
7. Давай пользователю только один следующий шаг.

## Маршрут

1. Уточнить режим запуска: Telegram-only, Telegram + база знаний, Telegram + amoCRM, полный запуск.
2. Определить Supabase deployment mode: cloud Supabase, self-hosted Supabase на SSH/VPS, уже готовая внешняя Postgres/Supabase строка или Supabase не нужен.
3. Подключить Supabase или провести пользователя по ручной инструкции.
4. Закрыть Supabase readiness gate: SQL применен, `sales_department` проверена, connection string работает из COMANDOS ОС/кабинета, а не только внутри Docker/SSH.
5. Подготовить базу знаний или собрать минимальный brief без базы.
6. Подключить Telegram-бота.
7. Провести исследование компании, аудитории, болей и конкурентов и собрать гипотезу для подтверждения владельцем.
8. Собрать brief.
9. Согласовать модель продажи, стратегию рекомендаций, план данных, цепочку живой квалификации и qualification gate: какие факты квалификатор и консультант должны собирать, какие факты обязательны до консультации и что можно брать из payload/истории/CRM без вопроса.
10. Собрать prompt квалификатора.
11. Собрать prompt консультанта.
12. Если нужен CRM-контур, подключить amoCRM.
13. Через setup-команду CRM собрать snapshot amoCRM, сравнить его с планом данных, согласовать недостающие поля и снять повторный snapshot, если пользователь добавил или изменил поля.
14. Согласовать критерии переходов по каждой стадии воронки.
15. Собрать финальный prompt CRM-оператора по примеру из skillpack, но строго под реальный вход COMANDOS ОС: `crm_operation_input`, `mcp_tool_results`, `tool_calls`, `crm_result`.
16. Вставить prompts в кабинет.
17. Через скрипты этого пакета найти или создать отдельную Telethon-сессию, провести Telegram smoke-test и, если CRM включена, проверить запись в amoCRM.

## Стоп-правила

- Не собирай prompt квалификатора и консультанта, пока нет brief и плана данных.
- Не устанавливай и не вызывай старый skill `telegram-testirovanie-bota` для этого запуска. Не создавай n8n test workflow и не используй `06_WF_Test`: Telegram-проверка полностью находится в `scripts/` этого пакета.
- Не запускай базу знаний, векторизацию, prompts или Telegram smoke-test, пока Supabase gate не закрыт, если выбран режим с базой знаний или CRM.
- Если пользователь просит "посмотреть Supabase на SSH", считай это этапом Supabase discovery: определи тип развертывания, что доступно только внутри сервера, что доступно снаружи, какую строку сможет использовать COMANDOS ОС, и обнови `LAUNCH_STATE.json`.
- Если нашел Supabase в Docker/на сервере, не отмечай Supabase готовой только потому, что `db:5433` работает внутри Docker-сети. Для внешнего кабинета нужна проверенная внешняя строка: cloud direct/pooler, защищенный direct-port/proxy или подтвержденная общая сеть.
- Не начинай с анкеты владельцу, если ответ можно извлечь из документов, сайта, RAG или brief. Сначала покажи гипотезу и попроси подтвердить или поправить.
- Не выбирай главный продукт насильно. Если флагман или приоритет неочевиден, спроси владельца: продвигать приоритетные позиции или подбирать строго по параметрам клиента.
- Не разрешай prompt-ам ставить `consultation`, пока владелец не подтвердил обязательный минимум фактов в `field_plan.md`. Если минимум не собран, бот должен оставаться в квалификации и задать один нативный вопрос.
- Не допускай default-диалог в стиле механической анкеты. Если клиент пишет "хочу автоматизировать заявки", нельзя отвечать длинной продажей или вопросом "помогу понять, откуда идут заявки". Сначала коротко выясни боль, путь заявки/процесса и где теряются деньги, время, клиенты или контроль.
- Не разрешай консультанту продавать решение, пока не ясно, через какую боль и какой текущий процесс это решение объясняется.
- Не собирай финальный prompt CRM-оператора, пока нет актуального CRM snapshot, CRM field gap и согласованных критериев переходов по воронке. Если поля менялись после первого snapshot, нужен повторный snapshot.
- Если интернет недоступен, не выдумывай исследование. Зафиксируй ограничение в roadmap/state и собери только проверяемый brief по материалам клиента.
- Если владелец не подтвердил, что поле или стадия нужны, не зашивай это в финальный prompt как обязательное действие.

## Что читать по ситуации

- Supabase: [references/supabase-connect.md](references/supabase-connect.md)
- Telegram: [references/telegram-connect.md](references/telegram-connect.md)
- Поиск Telegram-сессии: `scripts/telegram_session_doctor.py`
- Создание Telegram-сессии: `scripts/login_telethon_session.py`
- Живой Telegram-тест: `scripts/telegram_os_smoke.py`
- Шаблон тестового диалога: [templates/telegram_smoke_scenario.template.json](templates/telegram_smoke_scenario.template.json)
- База знаний: [references/knowledge-base.md](references/knowledge-base.md)
- Research/brief/field plan: [references/research-brief-field-plan.md](references/research-brief-field-plan.md)
- Prompt-flow: [references/prompt-flow.md](references/prompt-flow.md)
- Скелет prompt-а квалификатора: [templates/qualifier_prompt.skeleton.md](templates/qualifier_prompt.skeleton.md)
- Скелет prompt-а консультанта: [templates/consultant_prompt.skeleton.md](templates/consultant_prompt.skeleton.md)
- amoCRM: [references/amocrm-connect.md](references/amocrm-connect.md)
- CRM-оператор: [references/crm-operator.md](references/crm-operator.md)
- CRM field gap: [templates/crm_field_gap.template.md](templates/crm_field_gap.template.md)
- Пример CRM-prompt: [templates/crm_operator_prompt.example.md](templates/crm_operator_prompt.example.md)
- Финальная проверка: [references/final-smoke.md](references/final-smoke.md)

## Правила безопасности

- Не печатай полностью токены, пароли, connection string, client secret и license key.
- Не сохраняй секреты в markdown, roadmap, state или logs.
- Не сохраняй Telegram API ID/hash, номер телефона, код входа и 2FA в файлы пакета. Вводи их только в терминале; `.session` и `.comandos_os/` никогда не коммить.
- License key можно увидеть и использовать для установки один раз, но после установки нельзя повторять полный ключ в чате, отчете, командах проверки, markdown, логах или списке выполненных команд.
- Не пиши команды проверки с реальным ключом, например `rg '<полный license key>' ...`. Если проверяешь отсутствие ключа в файлах, в ответе пиши только: "проверено: полный license key не сохранен", без значения ключа.
- В `LAUNCH_STATE.json`, `PROJECT_NOTES.md` и ответах допускается только маска ключа, например первые/последние символы без полного значения.
- Connection string пользователь вставляет только в кабинет COMANDOS ОС или в защищенное окружение.
- Setup-команда CRM не является финальным prompt CRM-оператора.
- Финальный prompt CRM-оператора не должен содержать access token, refresh token, client secret, connection string или другие секреты.
- Финальный prompt CRM-оператора не должен менять pipeline/status без критериев перехода, явно подтвержденных владельцем в `crm_mapping.md`.
