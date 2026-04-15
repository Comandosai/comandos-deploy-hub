# Local Runner Universal

Универсальный локальный `Node.js runner`, который не зависит от Codex-specific runtime и подходит как основа для:

- Antigravity
- GitHub bundle install
- ручного запуска через терминал

## Что делает

1. Читает `prepared/docs/`
2. Пропускает пустые документы
3. Делит документы на батчи
4. Отправляет батчи в `commandos-api`
5. Сохраняет request/response в `processed/`
5. Проверяет или применяет `CYBEROP_BOOTSTRAP_SCHEMA.sql`
6. Пишет результат в `Supabase`
7. Переносит отработанные файлы в `vectorized/`
8. Пишет краткий state summary
9. Создает `products_live_readable.html` рядом с `products_live.tsv` для удобной визуальной проверки

## Стартовая структура workspace

```text
workspace/
  new_files/
  prepared/
    docs/
  vectorized/
    docs/
  processed/
  state/
```

После успешной записи в базу раннер:
- переносит файлы из `prepared/docs/` в `vectorized/docs/`;
- переносит `products_live.tsv` или `products_live.csv` в `vectorized/`, если такой файл участвовал в прогоне;
- переносит `products_live_readable.html` в `vectorized/`, если preview был сгенерирован;
- не оставляет отработанные файлы в `prepared/docs/`.

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
