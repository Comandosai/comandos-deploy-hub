# Local Runner Universal

Универсальный локальный `Node.js runner`, который не зависит от Codex-specific runtime и подходит как основа для:

- Antigravity
- GitHub bundle install
- ручного запуска через терминал

## Что делает

1. Читает `prepared/`
2. Пропускает пустые документы
3. Делит документы на батчи
4. Отправляет батчи в `commandos-api`
5. Сохраняет request/response в `processed/`
5. Проверяет или применяет `CYBEROP_BOOTSTRAP_SCHEMA.sql`
6. Пишет результат в `Supabase`
7. Пишет краткий state summary

## Стартовая структура workspace

```text
workspace/
  prepared/
  processed/
  state/
```

## Запуск

```bash
npm install
cp .env.example .env
npm start
```

## Что еще нужно добавить дальше

- incremental update через `content_hash`
- `runtime_manifest.json`
- bundle manifest под Antigravity/GitHub

## Уже встроенные защитные меры

- пропуск пустых `.md` / `.txt` файлов;
- ограничение документов в одном запросе через `SKILL_RUNTIME_MAX_DOCS_PER_REQUEST`;
- batched request/response snapshots в `processed/batches/`;
- нормализация пустых строковых значений в `products_live` перед записью в `Supabase`.
