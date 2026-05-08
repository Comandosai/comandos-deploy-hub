---
name: Поиск и импорт тем CyberSEO
description: Ищет темы для блога CyberSEO по cyberseo.project.yml, строит главные темы и подтемы, проверяет очередь и опубликованные статьи через .cyberseo.state.yml, убирает дубли, готовит import-rows.json и по подтверждению импортирует темы через /api/v1/queue/batch.
---

# Поиск и импорт тем CyberSEO

Навык нужен, чтобы собрать темы и положить их в очередь CyberSEO без ручной таблицы.

## Что читать

1. `cyberseo.project.yml`.
2. `.cyberseo.state.yml`.
3. [Контракт импорта тем](references/topic-import-contract.md).
4. [Правила поиска тем](references/research-rules.md).

## Что нужно для работы

Обязательное:

- API CyberSEO и админ-токен в `.cyberseo.state.yml`;
- `topics.main_topic`;
- `topics.country`;
- `topics.count`.

Желательное:

- `topics.city`;
- `topics.language`;
- `site.blog_description`;
- `site.about_blog`;
- `keys.firecrawl_api_key`;
- `keys.perplexity_api_key`.

Если Firecrawl или Perplexity не настроены, не падать. Продолжать тем способом, который доступен.

`topics.country` означает страну, где ищем спрос. `topics.language` означает язык ключей и статей.
Если `topics.language` пустой, выбрать язык по стране. Если заполнен, использовать его.
Пример: `country: Германия`, `city: Берлин`, `language: ru` — искать темы для русскоязычных людей в Германии.

## Порядок работы

1. Прочитать `cyberseo.project.yml`.
2. Прочитать `.cyberseo.state.yml`.
3. Получить текущую очередь:
   - `GET /api/v1/queue`
4. Получить опубликованные статьи:
   - `GET /api/v1/published`
5. Использовать реальные данные CyberSEO для ключей и спроса, если API доступен.
6. Если есть Firecrawl, аккуратно посмотреть конкурентов.
7. Собрать главные темы и подтемы.
8. Создать стабильные ID.
9. Убрать дубли.
10. Подготовить:
   - `cyberseo.topics.yml`;
   - `import-rows.json`;
   - `import-report.md`.
11. Показать список пользователю.
12. Импортировать только после подтверждения:
   - `POST /api/v1/queue/batch`

## Структура тем

Главная тема:

- `topic_role = pillar`;
- `topic_id` равен своему стабильному ID;
- `cluster_id` равен `topic_id`;
- `parent_topic_id` пустой.

Подтема:

- `topic_role = support`;
- `topic_id` свой;
- `cluster_id` равен `topic_id` главной темы;
- `parent_topic_id` равен `topic_id` главной темы.

## Правила дублей

Не импортировать тему, если:

- совпал `topic_id`;
- совпал `id`;
- такая тема уже есть среди опубликованных;
- совпали `main_keyword + country + city` и тема явно та же.

Похожие темы не удалять молча. Положить их в отчёт как “возможный дубль”.

## Perplexity

Perplexity использовать, если ключ заполнен и пользователь хочет работать через свой баланс Perplexity.

Не представлять Perplexity как обязательный ключ. Если его нет, продолжать через доступные источники CyberSEO.

## Выход

В конце дать:

- сколько тем найдено;
- сколько пропущено как дубли;
- сколько не подошло;
- какие файлы созданы;
- был ли импорт в очередь.
