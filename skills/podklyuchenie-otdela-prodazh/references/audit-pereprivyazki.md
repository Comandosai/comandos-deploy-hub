# Аудит перепривязки

После импорта workflow навык обязан:

1. Проверить unresolved credentials.
2. Делать SQL-аудит через `nodes::jsonb`.
3. Отдельно проверить refs, у которых есть `name`, но отсутствует `id`.
4. Различать два состояния:
- credential отсутствует вообще;
- credential существует, но не расшарен в проект.
5. Проверить `shared_credentials` для текущего `project_id`.
6. Проверить, что credentials импортированы или созданы с UUID v4, а не простыми строковыми ID.
7. Проверить, что OpenAI credentials имеют type `openAiApi`.
8. Если credentials импортировались через CLI, подтвердить, что использовался `--project <current_project_id>`.
9. Только после этого массово перепривязывать соединения.
10. После перепривязки заново открыть editor и проверить свежие логи `n8n`, чтобы убедиться, что ошибки битых credentials реально ушли.

Для `MCP` проверять отдельно:
- `MCP Postgres`
- `MCP AmoCRM`

Для `MCP Postgres` отдельно проверить, что credential содержит все 7 headers и хранит их через `headers.values`.
