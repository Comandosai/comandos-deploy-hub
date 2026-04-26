# Быстрые операции для проекта

Использовать только после чтения `DANNYE_DLYA_RAZVERTYVANIYA.md` и проектного `AmoCRM_skill/runtime_map.md`.

Все команды ниже — шаблоны. Подставлять значения только из файлов конкретного проекта. Не переносить реальные значения обратно в общий skill.

## Найти workflow по имени

Через базу `n8n`:

```bash
docker exec -i <n8n_postgres_container> psql -U <n8n_db_user> -d <n8n_db_name> -Atc "
select id || '|' || name || '|' || active
from workflow_entity
where name in (
  '02_Main_Orcestrator',
  '03_WF_Qualification',
  '04_WF_Consultation',
  '05_WF_Human_Handoff_Workflow',
  '07_WF_CRM_Operator'
)
order by name;
"
```

После нахождения workflow записать `id` в проектный `AmoCRM_skill/runtime_map.md`.

## Вставить prompt в живой n8n

Порядок:

1. Прочитать нужный файл из `Prompts/`.
2. Найти workflow по имени.
3. Найти AI-узел по имени или типу.
4. Обновить prompt в `workflow_entity`.
5. Если есть активная версия в `workflow_history`, обновить и ее.
6. Перечитать обе записи и сравнить текст или `sha256`.
7. Перезапустить `n8n` и worker, если эта установка берет активные workflow из памяти.

Важно: если обновить только черновик, живой тест может продолжить работать на старом prompt.

## Очистить рабочие таблицы проекта

Не трогать `knowledge_rag` и `products_live`.

```sql
TRUNCATE TABLE
  public.workflow_runs,
  public.messages,
  public.conversations,
  public.channel_identities,
  public.handoffs,
  public.lead_events,
  public.processed_events,
  public.chat_history,
  public.chat_history_raw_backup,
  public.nurture_state,
  public.daily_kpi,
  public.error_logs,
  public.leads
RESTART IDENTITY CASCADE;
```

Если в проекте нет одной из таблиц, сначала проверить список таблиц и убрать отсутствующую строку из `TRUNCATE`.

## Проверить, что база очищена

```sql
select 'knowledge_rag=' || (select count(*) from public.knowledge_rag)
union all select 'products_live=' || (select count(*) from public.products_live)
union all select 'leads=' || (select count(*) from public.leads)
union all select 'messages=' || (select count(*) from public.messages)
union all select 'lead_events=' || (select count(*) from public.lead_events)
union all select 'workflow_runs=' || (select count(*) from public.workflow_runs);
```

Ожидаемо:

- `knowledge_rag` больше 0;
- `products_live` больше 0;
- рабочие таблицы после очистки равны 0.

## Проверить CRM-событие

```sql
select
  id,
  lead_id,
  status,
  payload,
  created_at
from public.lead_events
where event_type = 'crm_sync'
order by id desc
limit 5;
```

Проверить:

- `status = completed`;
- `fields_updated` содержит реальные поля;
- `stage_updated` соответствует CRM-карте;
- ошибок в `errors` нет.

## Проверить handoff, заметку и задачу

```sql
select
  id,
  lead_id,
  status,
  task_id,
  summary,
  created_at
from public.handoffs
order by id desc
limit 5;
```

```sql
select
  id,
  lead_id,
  status,
  payload,
  created_at
from public.lead_events
where event_type = 'manager_notified'
order by id desc
limit 5;
```

Проверить:

- `task_id` заполнен;
- `crm_note_created = true`;
- `crm_task_created = true`;
- время задачи совпадает с фразой клиента и часовым поясом проекта.

## Проверить фактический вызов CRM Operator

В `n8n` смотреть последнее выполнение `07_WF_CRM_Operator`.

Нужно проверить не только ответ агента, но и вход инструмента `MCP AmoCRM`.

Для `update_contact` должен быть виден `custom_fields_values`, если CRM-карта требует записать кастомные поля контакта.
