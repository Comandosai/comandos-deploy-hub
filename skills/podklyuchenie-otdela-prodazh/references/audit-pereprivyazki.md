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
9. Найти актуальный ID workflow `Уведомления об ошибках в N8N`.
10. Прописать этот ID в `settings.errorWorkflow` всех импортированных workflow, кроме самого workflow ошибок.
11. Проверить, что `settings.errorWorkflow` не пустой и указывает на существующий workflow.
12. Только после этого массово перепривязывать соединения.
13. После перепривязки заново открыть editor и проверить свежие логи `n8n`, чтобы убедиться, что ошибки битых credentials реально ушли.

Жесткое правило:
- refs вида `credentials[type].name` без `credentials[type].id` недопустимы;
- workflow с такими refs нельзя публиковать, активировать или тестировать;
- если после rebind остался хотя бы один такой refs, этап должен завершаться ошибкой, а не warning.

Обязательная проверка refs без `id`:

```sql
SELECT
  we.id AS workflow_id,
  we.name AS workflow_name,
  node.value ->> 'name' AS node_name,
  cred.key AS credential_type,
  cred.value ->> 'name' AS credential_name,
  cred.value ->> 'id' AS credential_id
FROM workflow_entity AS we
CROSS JOIN LATERAL jsonb_array_elements(we.nodes::jsonb) AS node(value)
CROSS JOIN LATERAL jsonb_each(COALESCE(node.value -> 'credentials', '{}'::jsonb)) AS cred(key, value)
WHERE COALESCE(cred.value ->> 'name', '') <> ''
  AND COALESCE(cred.value ->> 'id', '') = ''
ORDER BY we.name, node.value ->> 'name', cred.key;
```

Если запрос вернул хотя бы одну строку, публиковать или активировать workflow запрещено.

Обязательный rebind по `(type + name)`:

```sql
WITH credential_map AS (
  SELECT id::text AS credential_id, name, type
  FROM credentials_entity
),
patched AS (
  SELECT
    we.id,
    jsonb_agg(
      CASE
        WHEN node.value ? 'credentials' THEN
          jsonb_set(
            node.value,
            '{credentials}',
            (
              SELECT jsonb_object_agg(
                cred.key,
                CASE
                  WHEN COALESCE(cred.value ->> 'name', '') <> ''
                   AND COALESCE(cred.value ->> 'id', '') = ''
                   AND cm.credential_id IS NOT NULL
                  THEN jsonb_set(cred.value, '{id}', to_jsonb(cm.credential_id), true)
                  ELSE cred.value
                END
              )
              FROM jsonb_each(COALESCE(node.value -> 'credentials', '{}'::jsonb)) AS cred(key, value)
              LEFT JOIN credential_map AS cm
                ON cm.type = cred.key
               AND cm.name = cred.value ->> 'name'
            ),
            true
          )
        ELSE node.value
      END
      ORDER BY node.ordinality
    ) AS patched_nodes
  FROM workflow_entity AS we
  CROSS JOIN LATERAL jsonb_array_elements(we.nodes::jsonb) WITH ORDINALITY AS node(value, ordinality)
  GROUP BY we.id
)
UPDATE workflow_entity AS we
SET nodes = patched.patched_nodes::json
FROM patched
WHERE we.id = patched.id;
```

После rebind тот же SQL-аудит нужно прогнать повторно. Нулевой результат — обязательный gate перед activation/publish.

Пример проверки `errorWorkflow` через SQL:

```sql
SELECT
  id,
  name,
  settings::jsonb ->> 'errorWorkflow' AS error_workflow
FROM workflow_entity
WHERE name IN (
  '01_Ingress_Channel_Intake',
  '02_Main_Orcestrator',
  '03_WF_Qualification',
  '04_WF_Consultation',
  '05_WF_Human_Handoff_Workflow',
  '06_WF_Test'
)
ORDER BY name;
```

Если значение пустое или указывает не на актуальный ID workflow `Уведомления об ошибках в N8N`, нужно исправить `settings.errorWorkflow` до запуска тестов.

Пример исправления `errorWorkflow` через SQL:

```sql
WITH error_workflow AS (
  SELECT id
  FROM workflow_entity
  WHERE name = 'Уведомления об ошибках в N8N'
  LIMIT 1
)
UPDATE workflow_entity
SET settings = jsonb_set(
  COALESCE(settings::jsonb, '{}'::jsonb),
  '{errorWorkflow}',
  to_jsonb((SELECT id FROM error_workflow)::text),
  true
)::json
WHERE name IN (
  '01_Ingress_Channel_Intake',
  '02_Main_Orcestrator',
  '03_WF_Qualification',
  '04_WF_Consultation',
  '05_WF_Human_Handoff_Workflow',
  '06_WF_Test'
)
AND EXISTS (SELECT 1 FROM error_workflow);
```

Для `MCP` проверять отдельно:
- `MCP Postgres`
- `MCP AmoCRM`

Для `MCP Postgres` отдельно проверить, что credential содержит все 7 headers и хранит их через `headers.values`.
