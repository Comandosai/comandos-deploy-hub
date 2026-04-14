# Runtime readiness

Зеленая конфигурация в `n8n` не означает, что workflow исполнимы.

Перед финальным тестом навык обязан проверить:
- установлены ли обязательные node packages;
- зарегистрированы ли обязательные credential types;
- не осталось ли пустых или битых credentials;
- есть ли доступ к `Supabase`, `Postgres`, `MCP`;
- есть ли `x-license-key`.

Если отсутствует:
- `@comandosai/n8n-nodes-doc-extract`
- `@comandosai/n8n-nodes-amo-crm`
- provider для `comandosLsiKeysApi`

то это надо докачать до тестов, а не оставлять как “потом”.
