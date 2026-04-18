# Credential Binding LITE

Короткая версия правил для постоянного использования. Полный deep-dive нужен только при `credentials / rebind / publish / activate`.

## API-контуры

- `GET/PUT /api/v1/*` использовать только с `X-N8N-API-KEY`.
- Для заголовка брать только `rawApiKey` из `/rest/api-keys`, не `apiKey`.
- `POST /rest/*` использовать только с cookie-сессией после `/rest/login`.

## Обязательные инварианты

- Draft-обновления недостаточно: после rebind нужно обновить active/published version.
- `test connection` не доказывает рабочий binding.
- Import без rebind, audit и republish не считается завершением этапа.
- `credential.id` валиден, если он непустой и принимается runtime; UUID-формат не требовать.

## Credentials

- `supabaseApi`: ключ класть в `serviceRole`, не в `serviceRoleSecret`.
- `MCP Postgres`: использовать `httpMultipleHeadersAuth` с 7 базовыми headers через `headers.values`.
- `MCP AmoCRM`: использовать `httpMultipleHeadersAuth` с `x-license-key`.
- `telegramApi`: `baseUrl = null`.

## Rebind и audit gate

- Для каждого `node.credentials[type].name` найти credential по `(type + name)` и прописать `id`.
- `name` без `id` = блокер.
- `id`, которого нет в live credentials = блокер.
- `settings.errorWorkflow` должен быть выставлен всем `01..06`, кроме самого workflow ошибок.

## Первый запуск

- Активировать только:
  - `06_WF_Test`
  - `Уведомления об ошибках в N8N`
- `01..05` держать выключенными.

## Перед боевым запуском

- Выключить `06_WF_Test`.
- Убедиться, что новые входящие идут в `01_Ingress_Channel_Intake`, а не в `06_WF_Test`.

## Минимальный acceptance

- refs `name` без `id` = `0`
- refs с битым `id` = `0`
- `06_WF_Test -> Supabase Vector Store -> Supabase.id` совпадает с live credential
- `06_WF_Test -> MCP Postgres -> MCP Postgres.id` совпадает с live credential
- `Уведомления... -> Telegram Error Bot.id` совпадает с live credential
