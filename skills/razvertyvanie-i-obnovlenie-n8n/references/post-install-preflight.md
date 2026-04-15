# Post-install preflight

После установки или обновления `n8n` навык обязан:

1. Проверить, что контейнеры действительно поднялись.
2. Определить `project_id`.
3. Проверить обязательные custom node packages.
4. Проверить обязательные credential types.
5. Проверить согласованность reverse proxy:
- `Traefik` не должен одновременно опираться на `file provider` и мертвые `docker labels`;
- если `n8n` стоит за прокси, должен быть корректный `N8N_PROXY_HOPS`.
6. Проверить синхронность пароля `n8n` в `.env` и роли в `Postgres`.
7. Выполнить smoke-test после рестарта контейнеров.
8. Открыть editor `n8n` после полного refresh страницы и убедиться, что нет постоянного `Connection lost`.
9. Проверить свежие логи `n8n` и убедиться, что в них нет:
- `Found credential with no ID`
- `Workflow activation failed validation`
- `User attempted to access a workflow without permissions`
- `password authentication failed`
10. Если чего-то не хватает, докачать или исправить это до передачи управления следующему навыку.

Минимальный обязательный список:
- `@comandosai/n8n-nodes-amo-crm`
- `@comandosai/n8n-nodes-doc-extract`
- provider для `comandosLsiKeysApi`

Если этого нет, `n8n` нельзя считать готовым к подключению отдела продаж.
