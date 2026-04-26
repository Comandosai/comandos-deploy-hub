# Шаблон проектной runtime-карты

Этот файл не хранится внутри общего skill как готовая карта клиента.

При работе с конкретным проектом агент должен создать или обновить проектный файл:

```text
AmoCRM_skill/runtime_map.md
```
Если папки `AmoCRM_skill/` нет, создать ее в проекте.

В общий skill нельзя переносить заполненную карту клиента. В ней могут быть реальные `workflow id`, имена узлов, адреса серверов, ключи, телефоны и другие данные конкретного проекта.

## Как заполнять

1. Найти workflow в `n8n` по имени, а не по заранее известному `id`.
2. Найти нужные AI-узлы по имени и типу.
3. Найти активную версию workflow, если текущий `n8n` использует версионность.
4. Записать найденные значения в проектный `AmoCRM_skill/runtime_map.md`.
5. Дальше в рамках проекта работать по этой карте, а не искать все заново.

## Шаблон файла проекта

```markdown
# Runtime-карта проекта

Обновлено: `<YYYY-MM-DD HH:mm timezone>`

## Источники проекта

- данные проекта: `DANNYE_DLYA_RAZVERTYVANIYA.md`
- контекст проекта: `KONTEXT_VNEDRENIYA_OTDELA_PRODAZH.md`
- CRM-карта: `Prompts/amocrm_crm_map.json`
- структура AmoCRM: `AmoCRM_skill/amocrm_structure_mcp_raw.json`

## Prompt-файлы

- квалификатор: `Prompts/prompt_qualifier.md`
- консультант: `Prompts/prompt_consultant.md`
- CRM Operator: `Prompts/prompt_crm_operator.md`

## n8n workflow

### 02_Main_Orcestrator

- найден: `<yes|no>`
- workflow id: `<fill from n8n>`
- активен: `<yes|no>`
- вызывает `crm_operator`: `<yes|no>`
- прямой `MCP AmoCRM` в оркестраторе: `<yes|no>`

### 03_WF_Qualification

- найден: `<yes|no>`
- workflow id: `<fill from n8n>`
- активен: `<yes|no>`
- prompt node name: `<fill from n8n>`
- prompt node id: `<fill from n8n>`
- active version id: `<fill if n8n has workflow history>`

### 04_WF_Consultation

- найден: `<yes|no>`
- workflow id: `<fill from n8n>`
- активен: `<yes|no>`
- prompt node name: `<fill from n8n>`
- prompt node id: `<fill from n8n>`
- active version id: `<fill if n8n has workflow history>`

### 05_WF_Human_Handoff_Workflow

- найден: `<yes|no>`
- workflow id: `<fill from n8n>`
- активен: `<yes|no>`
- note node name: `<fill from n8n>`
- task node name: `<fill from n8n>`
- time parsing node name: `<fill from n8n>`

### 07_WF_CRM_Operator

- найден: `<yes|no>`
- workflow id: `<fill from n8n>`
- активен: `<yes|no>`
- prompt node name: `<fill from n8n>`
- prompt node id: `<fill from n8n>`
- MCP AmoCRM node name: `<fill from n8n>`
- active version id: `<fill if n8n has workflow history>`

## База проекта

- схема: `<public|other>`
- чистить перед тестом: `leads`, `messages`, `conversations`, `channel_identities`, `workflow_runs`, `handoffs`, `lead_events`, `processed_events`, `chat_history`, `chat_history_raw_backup`, `nurture_state`, `daily_kpi`, `error_logs`
- не трогать: `knowledge_rag`, `products_live`

## Проверки после CRM-теста

- лид: `public.leads`
- события CRM: `public.lead_events`, `event_type = 'crm_sync'`
- handoff: `public.handoffs`
- заметка и задача: `public.lead_events`, `event_type = 'manager_notified'`
- фактический вызов AmoCRM: последнее выполнение `07_WF_CRM_Operator` в `n8n`

## Последняя проверка

- поля контакта AmoCRM заполнились: `<yes|no>`
- этап сделки изменился: `<yes|no>`
- заметка создана: `<yes|no>`
- задача создана: `<yes|no>`
- время задачи верное: `<yes|no>`
```
