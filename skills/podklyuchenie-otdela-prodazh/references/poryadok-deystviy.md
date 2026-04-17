# Порядок действий

## Шаг 1. Проверить инфраструктуру

Нужно выяснить:
- где стоит `Supabase`;
- где стоит `n8n`;
- это один сервер или два;
- есть ли уже доступы;
- используется схема `public` или другая.

Если что-то найдено автоматически, не переспрашивать.

## Шаг 2. Подключить Supabase

Нужно определить:
- `db_host`
- `db_port`
- `db_name`
- `db_user`
- `db_password`
- `db_schema`

Если схема не указана, по умолчанию считать `public`, но проговорить это в отчете.

## Шаг 3. Подключить n8n

Нужно:
- найти `n8n`;
- понять, как импортировать workflow;
- проверить существующие соединения;
- проверить, не загружены ли workflow раньше.

## Шаг 4. Загрузить workflow

Нужно загрузить:
- основной пакет workflow отдела продаж;
- дополнительный тестовый workflow для проверки базы.

Правило error workflow:
- workflow `Уведомления об ошибках в N8N` сначала импортируется и находится по имени в текущем n8n;
- его актуальный `id` нужно прописать в `settings.errorWorkflow` для всех остальных workflow пакета;
- нельзя полагаться только на `errorWorkflow` из JSON-шаблона, потому что после импорта в другой n8n ID может отличаться;
- workflow `Уведомления об ошибках в N8N` не должен ссылаться сам на себя как на error workflow.

Правило первого разворачивания:
- сразу после импорта активировать или опубликовать только `06_WF_Test` и `Уведомления об ошибках в N8N`;
- `01_Ingress_Channel_Intake`, `02_Main_Orcestrator`, `03_WF_Qualification`, `04_WF_Consultation`, `05_WF_Human_Handoff_Workflow` оставить выключенными;
- не запускать боевой отдел продаж до успешного теста базы знаний и отдельной команды пользователя на боевой запуск.

## Шаг 5. Создать соединения

Нужно создать или обновить:
- `Supabase`
- `Postgres`
- `MCP Postgres`
- `MCP AmoCRM`
- `OpenRouter`, если есть ключ
- `OpenAI`, если нужен голос или транскрибация
- `Telegram`, если нужен Telegram

Правило для `MCP AmoCRM`:
- если найден `x_license_key`, создать credential автоматически;
- не просить у пользователя отдельный блок headers, если уже хватает данных из файла развёртывания.

Правило для `MCP Postgres`:
- создать credential типа `HTTP Multiple Headers Auth`;
- использовать все 7 headers: `db_host`, `db_port`, `db_name`, `db_user`, `db_password`, `db_schema`, `x-license-key`;
- хранить headers в структуре `headers.values`;
- не считать credential готовым, если там только `x-license-key`.

Правило для Supabase:
- credential должен использовать host/API URL и `supabase_service_role_key`;
- anon key нельзя использовать вместо service role key.

Правило для n8n 2.x:
- credential IDs должны быть UUID v4;
- OpenAI type должен быть `openAiApi`;
- CLI-импорт credentials выполнять с `--project <current_project_id>`.
- После импорта workflow нельзя оставлять refs, где есть `credential.name`, но нет `credential.id`.

## Шаг 6. Привязать соединения к узлам

После создания соединений нужно:
- подставить их в workflow;
- проверить, что у узлов не осталось пустых ссылок;
- проверить, что не использованы старые или битые credentials.
- проверить `shared_credentials` для текущего `project_id`.
- проверить, что refs с `credential.name` без `credential.id` отсутствуют полностью;
- пройти все nodes с credentials и проверить не только `credentials.<type>.name`, но и `credentials.<type>.id`;
- считать binding сломанным, если у node есть `name`, но нет `id`, даже если credential существует, `test connection` проходит и UI показывает credential как выбранный;
- если такие refs есть, сделать rebind по `(type + name) -> id` через `credentials_entity`;
- если после rebind такие refs остались, остановить этап с ошибкой;
- пока эти refs не обнулены, запрещено публиковать, активировать и тестировать workflow;
- проверить, что у `01_Ingress_Channel_Intake`, `02_Main_Orcestrator`, `03_WF_Qualification`, `04_WF_Consultation`, `05_WF_Human_Handoff_Workflow` и `06_WF_Test` задан актуальный `settings.errorWorkflow`;
- если `settings.errorWorkflow` отсутствует или указывает на несуществующий workflow, исправить до тестов и активации.

## Шаг 7. Подключить тестового агента

Отдельно нужно установить простой workflow `06_WF_Test`, который:
- ходит в базу через `MCP`;
- использует общий prompt;
- позволяет быстро проверить качество данных.

На первом разворачивании активными должны быть только `06_WF_Test` и `Уведомления об ошибках в N8N`.

## Шаг 8. Telegram-тестирование

Если пользователь просит, отдельно включить модуль Telegram-тестирования:
- поднять зависимости;
- до Telegram-теста выполнить runtime credential audit для `02_Main_Orcestrator`, `03_WF_Qualification`, `04_WF_Consultation` и `05_WF_Human_Handoff_Workflow`;
- проверить draft workflow и active/published version workflow по отдельности, если опубликованная версия уже существует;
- если хотя бы в одной боевой node нет `credential.id`, перепривязать credential, сохранить workflow и обновить active/published version до старта Telegram-тестов;
- выполнить отдельный smoke-test этих workflow и убедиться, что нет `Found credential with no ID` и `Authorization failed - please check your credentials`;
- провести 5 или 10 тестов;
- собрать диалоги;
- выдать отчет по качеству.

## Шаг 9. Финальная проверка

Обязательно проверить:
- доступ к `Supabase`;
- доступ к `Postgres`;
- доступ к `MCP`;
- наличие `x-license-key`;
- загрузку workflow;
- что не осталось refs с `credential.name` без `credential.id`;
- что workflow не считаются готовыми только по успешному `test connection`, существующему credential имени или отсутствию ошибки на импорте;
- что runtime-ready binding подтвержден для `02_Main_Orcestrator`, `03_WF_Qualification`, `04_WF_Consultation` и `05_WF_Human_Handoff_Workflow`;
- что после первого разворачивания активны только `06_WF_Test` и `Уведомления об ошибках в N8N`, а боевые workflow выключены;
- что все workflow пакета, кроме самого workflow ошибок, отправляют падения в `Уведомления об ошибках в N8N`;
- хотя бы один тестовый запуск.

## Шаг 10. Итоговый отчет

В конце нужно коротко зафиксировать:
- что найдено;
- что создано;
- что подключено;
- что не получилось;
- что осталось сделать вручную, если осталось.
