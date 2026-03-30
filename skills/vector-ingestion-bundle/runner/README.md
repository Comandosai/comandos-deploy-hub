# Local Runner Universal

Универсальный локальный `Node.js runner`, который не зависит от Codex-specific runtime и подходит как основа для:

- Antigravity
- GitHub bundle install
- ручного запуска через терминал

## Что делает

1. Читает `prepared/`
2. Собирает runtime payload
3. Отправляет его в `commandos-api`
4. Сохраняет request/response в `processed/`
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
