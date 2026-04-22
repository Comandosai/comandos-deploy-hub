# Карта CyberSEO workflow

Ожидаемый набор:

- `CyberSEO / ВФ 0: МАСТЕР`
- `CyberSEO / ВФ 1: МОЗГ`
- `CyberSEO / ВФ 2: ЗАЦЕП (HOOK)`
- `CyberSEO / ВФ 3: ТЕЛО`
- `CyberSEO / ВФ 4: ГЕНЕРАЦИЯ ИЗОБРАЖЕНИЯ`
- `Узлы`

Связи:

- В `ВФ 0` узел `ВФ 1` вызывает `CyberSEO / ВФ 1: МОЗГ`.
- В `ВФ 0` узел `ВФ 2` вызывает `CyberSEO / ВФ 2: ЗАЦЕП (HOOK)`.
- В `ВФ 0` узел `ВФ 3` вызывает `CyberSEO / ВФ 3: ТЕЛО`.
- В `ВФ 2` узел `Генерация изображения` вызывает `CyberSEO / ВФ 4: ГЕНЕРАЦИЯ ИЗОБРАЖЕНИЯ`.
- В `ВФ 3` узел `Генерация изображения` вызывает `CyberSEO / ВФ 4: ГЕНЕРАЦИЯ ИЗОБРАЖЕНИЯ`.

Клиентские значения лежат в `ВФ 0`:

- узел: `Установка ID таблицы`
- поле: `table`
- поле: `domen`

Если workflow переименован, искать нужно не по имени, а по наличию узла `Установка ID таблицы`.

Не искать эти значения в `.env`, docker compose, логах и папках сервера. В живом `n8n` источник только один: `workflow_entity.nodes`.

SQL для поиска:

```sql
select
  we.id,
  we.name,
  max(item->>'value') filter (where item->>'name' = 'table') as table,
  max(item->>'value') filter (where item->>'name' = 'domen') as domen
from workflow_entity we
cross join lateral json_array_elements(we.nodes) node
cross join lateral json_array_elements(node->'parameters'->'assignments'->'assignments') item
where node->>'name' = 'Установка ID таблицы'
group by we.id, we.name;
```

Правило включения:

- `n8n` 2.x и выше: `ВФ 0-4` должны быть опубликованы и активны.
- `n8n` ниже 2.x: активен только `ВФ 0`; `ВФ 1-4` остаются выключенными, потому что они вызываются как подворкфлоу.
- `Узлы` не включать.
