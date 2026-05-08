# Импорт настроек в CyberSEO

Адреса идут от `client_api.url`.

Заголовки:

```text
Authorization: Bearer <client_api.admin_token>
Content-Type: application/json
```

## Лицензия

```text
POST /api/v1/license/connect
```

Тело:

```json
{
  "license_key": "..."
}
```

## Настройки

```text
POST /api/v1/settings
```

Формат одной настройки:

```json
{
  "id": "setting-writer_style_prompt",
  "key": "writer_style_prompt",
  "label": "Промпт стиля текста",
  "value": "...",
  "value_type": "string",
  "hint": "Какой стиль использовать для текста."
}
```

Ключи:

- `default_country_code`
- `default_country`
- `default_city`
- `default_language_mode`
- `default_language`
- `writer_style_prompt`
- `image_style_prompt`
- `img_url`
- `telegram_notify_enabled`

## Секреты

```text
POST /api/v1/secrets
```

Секреты не сохранять как обычные настройки.

Типы:

- `license_key`
- `wordpress_url`
- `wordpress_username`
- `wordpress_app_password`
- `openrouter_api_key`
- `perplexity_api_key`
- `telegram_bot_token`
- `telegram_chat_id`
- `yandex_search_api_key`
- `yandex_folder_id`

