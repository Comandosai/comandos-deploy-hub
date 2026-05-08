# Контракт импорта тем

Адрес API и админ-токен брать из `cyberseo.project.yml`, блок `state.cyberseo`.
Отдельный `.cyberseo.state.yml` не создавать и не использовать.

Заголовки:

```text
Authorization: Bearer <client_admin_token>
Content-Type: application/json
```

## Читать перед импортом

```text
GET /api/v1/queue
GET /api/v1/published
```

## Импортировать пачкой

```text
POST /api/v1/queue/batch
```

Тело — массив строк из `cyberseo.project.yml -> state.topics.rows`:

```json
[
  {
    "id": "implant-main",
    "topic_id": "implant-main",
    "cluster_id": "implant-main",
    "topic_role": "pillar",
    "parent_topic_id": "",
    "main_keyword": "имплантация зубов",
    "category_hint": "Имплантация",
    "country": "Россия",
    "city": "Москва",
    "language_override": "ru",
    "status": "queued",
    "notes": "Главная статья кластера. year_mode=forbidden"
  }
]
```

Обязательные поля:

- `id`
- `topic_id`
- `cluster_id`
- `topic_role`
- `main_keyword`
- `status`

Для подтемы:

- `topic_role = support`
- `parent_topic_id` указывает на главную тему
- `cluster_id` равен `topic_id` главной темы

Код страны человек не заполняет. Если API требует `country_code`, агент определяет его по `topics.country`.

`language_override` брать из `topics.language`. Если `topics.language` пустой, оставить `language_override` пустым и дать CyberSEO выбрать язык по стране.

## Как делать ID

ID должны быть стабильными. Не использовать случайные числа, если можно сделать понятный slug.

Пример:

- главная тема: `implantatsiya-zubov`
- подтема: `implantatsiya-zubov-tsena`

Если slug совпал, добавить короткое уточнение по городу или смыслу.
