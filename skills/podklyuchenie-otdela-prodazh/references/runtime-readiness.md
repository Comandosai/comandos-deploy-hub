# Runtime readiness

Зеленая конфигурация в `n8n` не означает, что workflow исполнимы.

Перед финальным тестом навык обязан проверить:
- установлены ли обязательные node packages;
- зарегистрированы ли обязательные credential types;
- не осталось ли пустых или битых credentials;
- не осталось ли refs, у которых есть `name`, но отсутствует `id`;
- у используемых credentials есть непустой `id`, который реально принимается текущим n8n runtime;
- OpenAI credential type равен `openAiApi`;
- `MCP Postgres` содержит базовые 7 headers в структуре `headers.values`, а дополнительный `tenant_id` допускается как валидное расширение;
- есть ли доступ к `Supabase`, `Postgres`, `MCP`;
- есть ли `x-license-key`.
- есть ли `supabase_service_role_key`, если создается Supabase credential.

Перед тем как говорить пользователю `готово`, навык обязан:
- убедиться, что SQL-аудит refs с `credential.name` без `credential.id` вернул ноль строк;
- если аудит вернул хотя бы одну строку, считать этап проваленным и не переходить к `publish/activate`;
- не считать workflow готовым только потому, что UI показывает выбранный credential;
- не считать workflow готовым только потому, что credential с нужным именем существует или проходит `test connection`;
- не считать `null` или пустые значения в non-secret полях credential автоматической ошибкой, если publish/activate и runtime execution проходят;
- не переписывать рабочий UI-created credential только ради приведения к старому JSON-виду;
- отдельно проверить draft workflow и active/published version workflow, если опубликованная версия существует;
- до финального Telegram-теста выполнить runtime credential audit для `02_Main_Orcestrator`, `03_WF_Qualification`, `04_WF_Consultation` и `05_WF_Human_Handoff_Workflow`;
- для каждого node с credentials убедиться, что сохранены и `name`, и `id`;
- если хотя бы в одной боевой node отсутствует `credential.id`, сначала сделать rebind, сохранить workflow и обновить active/published version;
- открыть editor `n8n` после полного refresh страницы;
- убедиться, что editor не уходит в постоянный `Connection lost`;
- проверить свежие логи `n8n`;
- убедиться, что в логах нет:
  - `Found credential with no ID`
  - `Authorization failed - please check your credentials`
  - `Workflow activation failed validation`
  - `User attempted to access a workflow without permissions`

Если отсутствует:
- `@comandosai/n8n-nodes-doc-extract`
- `@comandosai/n8n-nodes-amo-crm`
- provider для `comandosLsiKeysApi`

то это надо докачать до тестов, а не оставлять как “потом”.
