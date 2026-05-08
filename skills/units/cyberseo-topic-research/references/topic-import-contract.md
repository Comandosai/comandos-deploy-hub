# Контракт импорта тем

Адреса идут от `client_api.url`.

Заголовки:

```text
Authorization: Bearer <client_api.admin_token>
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

Тело — массив строк:

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
    "primary_offer_id": "free-consultation",
    "country_code": "RU",
    "country": "Россия",
    "city": "Москва",
    "language_override": "",
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

## Как делать ID

ID должны быть стабильными. Не использовать случайные числа, если можно сделать понятный slug.

Пример:

- главная тема: `implantatsiya-zubov`
- подтема: `implantatsiya-zubov-tsena`

Если slug совпал, добавить короткое уточнение по городу или смыслу.

