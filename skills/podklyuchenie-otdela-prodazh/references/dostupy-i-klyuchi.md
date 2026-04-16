# Доступы и ключи

## Обязательные

Навык должен уметь запросить:
- доступ к серверу с `Supabase` или прямые данные подключения к базе;
- доступ к серверу с `n8n` или доступ к самому `n8n`;
- `x-license-key` для кастомного `MCP`.

## Важно

`x-license-key` обязателен.

Его нужно использовать при настройке `MCP Postgres`.
Без него подключение `MCP` не считается рабочим.
Если `x_license_key` уже записан в `DANNYE_DLYA_RAZVERTYVANIYA.md`, его же нужно использовать для автоматической сборки `MCP AmoCRM` без ручного шаблона headers.

## Правила n8n 2.x для credentials

- Все создаваемые credentials должны иметь UUID v4 как `id`.
- Нельзя использовать простые строковые ID вроде `openai-1`, `telegram-main`, `postgres-test`.
- Для OpenAI использовать credential type `openAiApi`.
- Не использовать устаревший type `openaiApi`.
- При импорте через CLI всегда использовать текущий `project_id`:
  - `n8n import:credentials --project <current_project_id> --input <file>`
- `project_id` нужно сначала определить в текущем `n8n`, а не хардкодить старое значение из другого инстанса.
- После импорта проверить `shared_credentials`, чтобы credentials были видны в текущем проекте.

## Параметры для `MCP Postgres`

Тип соединения:
- `HTTP Multiple Headers Auth`

Endpoint:
- `https://postgres.mcp.comandos.ai/`

Headers:
- `db_host`
- `db_port`
- `db_name`
- `db_user`
- `db_password`
- `db_schema`
- `x-license-key`

Важно:
- использовать только эти точные имена заголовков;
- не заменять их на `DB_HOST`, `database_host`, `db-user`, `x_license_key` или другие варианты;
- `x_license_key` допустим только как имя поля в `DANNYE_DLYA_RAZVERTYVANIYA.md`, но в самом HTTP header должно быть именно `x-license-key`.
- в JSON credential для `HTTP Multiple Headers Auth` использовать структуру `headers.values`, а не прямой массив `headers`.

Правильная структура:

```json
{
  "headers": {
    "values": [
      { "name": "db_host", "value": "..." },
      { "name": "db_port", "value": "..." },
      { "name": "db_name", "value": "..." },
      { "name": "db_user", "value": "..." },
      { "name": "db_password", "value": "..." },
      { "name": "db_schema", "value": "..." },
      { "name": "x-license-key", "value": "..." }
    ]
  }
}
```

## Параметры для `MCP AmoCRM`

Тип соединения:
- `HTTP Multiple Headers Auth`

Endpoint:
- `https://amocrm.mcp.comandos.ai`

Headers по умолчанию:
- `x-license-key`

Правило:
- если `x_license_key` уже найден, credential `MCP AmoCRM` должен быть собран автоматически;
- ручные headers запрашивать только если автоматическая сборка невозможна.

## Параметры для Supabase

Для Supabase credential обязательно нужны:
- `supabase_dashboard_url` или API URL/host;
- `supabase_service_role_key`.

Правила:
- не подменять `supabase_service_role_key` публичным anon key;
- если найден только anon key, считать серверный Supabase credential неготовым;
- если service role key отсутствует, запросить только его.

## Опциональные ключи

Навык должен уметь запросить, если это действительно нужно:
- `OpenRouter API key`
- `OpenAI API key`
- `Telegram bot token`

## Когда какой ключ нужен

### OpenRouter

Нужен, если workflow используют `OpenRouter`.

### OpenAI

Нужен, если:
- нужен голос;
- нужна транскрибация;
- нужен аудио-ввод или аудио-обработка.

### Telegram

Нужен, если:
- пользователь хочет подключить Telegram-бота;
- пользователь хочет прогнать Telegram-тесты.

Для Telegram использовать два отдельных токена:
- `telegram_sales_bot_token` — основной бот отдела продаж;
- `telegram_error_bot_token` — бот для workflow `Уведомления об ошибках в N8N`.

## Как спрашивать

Правило:
- сначала пытаться найти то, что уже есть;
- если чего-то не хватает, спрашивать только недостающий доступ или ключ;
- не выводить пользователю длинный список всех возможных секретов без необходимости.
