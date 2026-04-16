# Post-install preflight

После установки или обновления `n8n` навык обязан:

1. Проверить, что контейнеры действительно поднялись.
2. Определить `project_id`.
3. Проверить обязательные custom node packages.
4. Проверить обязательные credential types.
5. Проверить согласованность reverse proxy:
- `Traefik` и `n8n` должны работать только по одной модели маршрутизации:
  - либо `docker provider + labels`,
  - либо `file provider + traefik_dynamic`;
- нельзя смешивать оба режима в одном инстансе;
- если `n8n` стоит за прокси, должны быть корректны `N8N_PROXY_HOPS`, `N8N_EDITOR_BASE_URL` и `N8N_PUSH_BACKEND=websocket`.
6. Проверить синхронность пароля `n8n` в `.env` и роли в `Postgres`.
7. Выполнить smoke-test после рестарта контейнеров.
8. Открыть editor `n8n` после полного refresh страницы и убедиться, что нет постоянного `Connection lost`.
9. Проверить через SQL-аудит, что refs `credential.name` без `credential.id` отсутствуют полностью.
10. Проверить свежие логи `n8n` и убедиться, что в них нет:
- `Found credential with no ID`
- `Workflow activation failed validation`
- `User attempted to access a workflow without permissions`
- `password authentication failed`
11. Если refs без `id` найдены, не передавать управление дальше до rebind или явной ручной фиксации.
12. Если чего-то не хватает, докачать или исправить это до передачи управления следующему навыку.
13. Убедиться, что на этом этапе не были автоматически созданы прикладные credentials вроде `Postgres`, `Supabase`, `MCP Postgres`, `OpenAI`, `OpenRouter` или `Telegram Bot`.

Проверка refs без `id`:

```sql
SELECT
  we.name AS workflow_name,
  node.value ->> 'name' AS node_name,
  cred.key AS credential_type,
  cred.value ->> 'name' AS credential_name
FROM workflow_entity AS we
CROSS JOIN LATERAL jsonb_array_elements(we.nodes::jsonb) AS node(value)
CROSS JOIN LATERAL jsonb_each(COALESCE(node.value -> 'credentials', '{}'::jsonb)) AS cred(key, value)
WHERE COALESCE(cred.value ->> 'name', '') <> ''
  AND COALESCE(cred.value ->> 'id', '') = '';
```

Минимальный обязательный список:
- `@comandosai/n8n-nodes-amo-crm`
- `@comandosai/n8n-nodes-doc-extract`
- provider для `comandosLsiKeysApi`

Если этого нет, `n8n` нельзя считать готовым к подключению отдела продаж.
