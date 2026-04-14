---
name: Векторизация и загрузка базы
description: Устанавливает и запускает полный пакет для разбора документов, создания __workspace, сборки products_live, векторизации через COMANDOS runtime и записи результата в Supabase. Использовать в Antigravity, Claude, Codex или терминальном режиме, когда нужно быстро подготовить базу знаний и товарную таблицу клиента.
---

# Векторизация и загрузка базы

Это полный installable bundle для подготовки базы знаний и товарной таблицы.

Он включает:
- встроенный `doc-splitter`;
- launcher для разборки документов;
- launcher для ingestion;
- локальный `Node.js` runner;
- install notes для `Antigravity`, `Claude`, `Codex`;
- схему `CYBEROP_BOOTSTRAP_SCHEMA.sql`.

## Что читать в первую очередь

1. [README.md](README.md)
2. [installers/antigravity.md](installers/antigravity.md)
3. [installers/claude.md](installers/claude.md)
4. [installers/codex.md](installers/codex.md)

Для внутренней логики bundle использует:
- [skills/doc-splitter/SKILL.md](skills/doc-splitter/SKILL.md)
- [skills/doc-splitter-launcher/SKILL.md](skills/doc-splitter-launcher/SKILL.md)
- [skills/vector-ingestion-launcher/SKILL.md](skills/vector-ingestion-launcher/SKILL.md)

## Правила

- Пользовательский текст и названия держать по-русски.
- Не просить пользователя вручную запускать `node` в нормальном сценарии.
- Использовать встроенный `doc-splitter`, а не внешний урезанный вариант.
- Если factual product rows есть, `products_live` должна создаваться в этом же проходе.
- По умолчанию `tenant_id` в `products_live` должен быть `global`, если пользователь отдельно не дал другой.
- Если в проекте есть персональные данные, production `Supabase` должен быть на российском сервере.
- Workspace должен жить по трехзонной схеме:
  - `new_files/` — новые сырые файлы;
  - `prepared/docs/` — очищенные файлы, готовые к векторизации;
  - `vectorized/docs/` — уже успешно обработанные файлы.
- После успешной записи в базу отработанные файлы должны переноситься из `prepared/docs/` в `vectorized/docs/`.
- В `prepared/docs/` не должно оставаться уже обработанных файлов, чтобы следующий прогон не создавал дубли.

## Где должен выполняться ingestion

- Runner должен выполняться на том хосте, где есть:
  - доступ к документам;
  - доступ к `api.comandos.ai`.
- Сервер с `Supabase` — это хранилище, а не основное место выполнения ingestion по умолчанию.
- Если хост с доступом к базе не имеет выхода в интернет, допускается только fallback:
  - получить runtime result JSON на машине с интернетом;
  - потом импортировать его в `Supabase`.

## Обязательная структура `__workspace`

```text
__workspace/
  new_files/
  prepared/
    docs/
    products_live.tsv
  vectorized/
    docs/
    products_live.tsv
  processed/
  state/
```

Логика движения файлов:
- новые файлы попадают в `new_files/`;
- после очистки и нормализации они переходят в `prepared/docs/`;
- после успешной векторизации и записи в `Supabase` эти же файлы переходят в `vectorized/docs/`;
- если создан `products_live.tsv`, после успешной записи он тоже переносится в `vectorized/`.
