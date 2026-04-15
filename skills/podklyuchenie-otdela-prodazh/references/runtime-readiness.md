# Runtime readiness

Зеленая конфигурация в `n8n` не означает, что workflow исполнимы.

Перед финальным тестом навык обязан проверить:
- установлены ли обязательные node packages;
- зарегистрированы ли обязательные credential types;
- не осталось ли пустых или битых credentials;
- не осталось ли refs, у которых есть `name`, но отсутствует `id`;
- есть ли доступ к `Supabase`, `Postgres`, `MCP`;
- есть ли `x-license-key`.

Перед тем как говорить пользователю `готово`, навык обязан:
- открыть editor `n8n` после полного refresh страницы;
- убедиться, что editor не уходит в постоянный `Connection lost`;
- проверить свежие логи `n8n`;
- убедиться, что в логах нет:
  - `Found credential with no ID`
  - `Workflow activation failed validation`
  - `User attempted to access a workflow without permissions`

Если отсутствует:
- `@comandosai/n8n-nodes-doc-extract`
- `@comandosai/n8n-nodes-amo-crm`
- provider для `comandosLsiKeysApi`

то это надо докачать до тестов, а не оставлять как “потом”.
