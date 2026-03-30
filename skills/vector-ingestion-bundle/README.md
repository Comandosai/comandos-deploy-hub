# COMANDOS Vector Ingestion Bundle

Публичная коробка для установки `COMANDOS`-skills и локального ingestion-раннера через:

- `Antigravity`
- `Claude`
- `Codex`
- обычный терминал

## Что внутри

- `skills/doc-splitter-launcher`
- `skills/vector-ingestion-launcher`
- `runner/` с локальным `Node.js` раннером
- `CYBEROP_BOOTSTRAP_SCHEMA.sql`
- общие install-файлы: `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, `.env.example`, `manifest.json`

## Что делает bundle

1. Помогает агенту установить локальные skills.
2. Дает понятный вход для запуска `doc-splitter`.
3. Дает понятный вход для запуска `ingestion flow`.
4. Позволяет агенту:
   - взять `prepared`-документы;
   - отправить их в `commandos-api`;
   - получить `chunks + embeddings`;
   - записать результат в `Supabase`.

## Быстрый старт

1. Скачай этот bundle из GitHub.
2. Положи его в локальную рабочую директорию.
3. Скопируй `.env.example` в `.env` и заполни нужные значения.
4. Дай агенту одну из команд ниже.

## Команды для агента

### Шаг 1. Разделить документы

```text
Используй skill `doc-splitter-launcher`.
Возьми сырые документы из папки `/путь/к/документам`.
Создай или обнови `__workspace`.
Сразу сделай:
- `docs`
- `product_memory`, если нужно
- `products_live`, если в источнике есть реальные factual live rows
```

### Шаг 2. Запустить ingestion flow

```text
Используй skill `vector-ingestion-launcher`.
Возьми подготовленные документы из созданного workspace.
Запусти ingestion flow:
- `prepared/docs` -> `commandos-api`
- получить `chunks + embeddings`
- загрузить результат в `Supabase`
Если не хватает доступов к `Supabase` или серверу, сначала запроси у меня только недостающие данные.
```

### Шаг 3. Проверить результат

```text
Проверь результат в `Supabase` и коротко покажи:
- сколько записей загружено в `knowledge_rag`
- сколько записей загружено в `products_live`
- были ли ошибки
```

## Что должен делать агент

Агент не должен:

- просить пользователя вручную запускать `node`;
- предлагать собирать произвольную таблицу от себя;
- уводить flow в другие побочные сценарии вместо текущего runtime-пути.

Агент должен:

- спрашивать только минимум нужных данных;
- сам вести install-flow;
- сам запускать `runner` как внутренний шаг;
- если в проекте есть персональные данные, требовать `RU server` для production-сценария.

## Структура bundle

```text
vector-ingestion-bundle/
  README.md
  manifest.json
  .env.example
  AGENTS.md
  CLAUDE.md
  GEMINI.md
  CYBEROP_BOOTSTRAP_SCHEMA.sql
  skills/
    doc-splitter-launcher/
      SKILL.md
    vector-ingestion-launcher/
      SKILL.md
  runner/
    package.json
    .env.example
    src/
  installers/
    antigravity.md
    claude.md
    codex.md
```
