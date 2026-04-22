---
name: Обновление CyberSEO workflow
description: Обновляет набор CyberSEO workflow в существующем n8n клиента: заходит на сервер по SSH, находит n8n, сохраняет старые workflow, читает table и domen из узла "Установка ID таблицы" в ВФ 0, импортирует свежие workflow, связывает подворкфлоу между собой, переносит подключения и включает нужные сценарии. Использовать, когда нужно обновить CyberSEO у клиента без ручной замены workflow в n8n.
---

# Обновление CyberSEO workflow

Навык нужен для одного действия: обновить клиентский набор CyberSEO workflow в уже установленном `n8n`.

Агент должен спросить у пользователя только доступ к серверу, если его нет. Всё остальное искать сам.

## Главная команда

После установки навыка запусти:

```bash
python3 scripts/update_cyberseo_workflows.py --ssh-host <host>
```

Если SSH настроен алиасом:

```bash
python3 scripts/update_cyberseo_workflows.py --ssh-host Main
```

Перед реальной заменой можно сделать только проверку:

```bash
python3 scripts/update_cyberseo_workflows.py --ssh-host <host> --dry-run
```

## Что делает скрипт

1. Проверяет SSH-доступ.
2. Если вход по ключу ещё не настроен, создаёт локальный SSH-ключ и добавляет его на сервер.
3. Пишет пользователю команду входа вида `ssh -i <ключ> <сервер>`.
4. Находит контейнеры `n8n`, `Postgres` и `Redis`.
5. Делает резервную копию старых CyberSEO workflow.
6. Ищет старый `CyberSEO / ВФ 0: МАСТЕР`. Если точного имени нет, ищет любой workflow с узлом `Установка ID таблицы`.
7. Читает из найденного узла `Установка ID таблицы` значения `table` и `domen`.
8. Копирует новые workflow из `assets/workflows` на сервер.
9. Импортирует новые workflow через `n8n import:workflow`.
10. Проставляет актуальные связи:
   - `ВФ 0` -> `ВФ 1`
   - `ВФ 0` -> `ВФ 2`
   - `ВФ 0` -> `ВФ 3`
   - `ВФ 2` -> `ВФ 4`
   - `ВФ 3` -> `ВФ 4`
11. Возвращает в новый `ВФ 0` старые значения `table` и `domen`.
12. Привязывает подключения по паре `тип + имя`, если такие подключения есть в живом `n8n`.
13. Проверяет, что у подключений в workflow есть `id`.
14. Включает workflow по версии `n8n`:
   - `n8n` 2.x и выше: публикует и включает `ВФ 0`, `ВФ 1`, `ВФ 2`, `ВФ 3`, `ВФ 4`;
   - `n8n` ниже 2.x: включает только `ВФ 0`, подворкфлоу оставляет выключенными.

## Правила

- Не читать и не печатать тексты промптов из workflow без нужды.
- Не показывать пользователю секреты, ключи и пароли.
- Сначала настроить вход по SSH-ключу, если его ещё нет. Приватный ключ не печатать.
- После настройки ключа сказать пользователю простую команду входа на сервер.
- До замены всегда делать резервную копию.
- `table` и `domen` искать только в базе `n8n`, в таблице `workflow_entity`, в JSON-поле `nodes`.
- Не искать `table` и `domen` в `.env`, файлах сервера, docker compose, логах, истории команд и рабочих папках.
- Перед тем как просить `table` и `domen`, выполнить точечный SQL-поиск узла `Установка ID таблицы`.
- Если старый `ВФ 0` переименован, искать любой workflow, где в `nodes` есть узел `Установка ID таблицы`.
- Если после точечного SQL-поиска узел не найден, остановиться и сказать, что в этой базе n8n нет старого workflow с узлом `Установка ID таблицы`.
- Если после импорта остались подключения с `name`, но без `id`, не говорить, что всё готово.
- Если не найден нужный кастомный узел n8n, остановиться и прямо назвать, какого пакета не хватает.
- Не удалять старые workflow, пока новая версия не импортирована и не проверена.
- Если есть дубли CyberSEO workflow, работать с теми, у которых ID совпадают с новым пакетом или которые были обновлены последними.
- Для `n8n` 2.x и выше одного `active=true` недостаточно: после импорта нужно выполнить `publish:workflow` для `ВФ 0-4`, потом включить их.
- Для `n8n` ниже 2.x подворкфлоу не включать: активным должен быть только мастер `ВФ 0`.

## Где именно лежат table и domen

В JSON-файле шаблона это здесь:

```text
assets/workflows/CyberSEO - ВФ 0_ МАСТЕР.json
строки 139-148: assignments с table и domen
строка 162: name = "Установка ID таблицы"
```

В живом `n8n` эти же данные лежат не в файлах сервера, а в базе:

```text
workflow_entity.nodes
```

Точечный запрос:

```sql
select
  we.id,
  we.name,
  node->>'name' as node_name,
  node->'parameters'->'assignments'->'assignments' as assignments
from workflow_entity we
cross join lateral json_array_elements(we.nodes) node
where node->>'name' = 'Установка ID таблицы';
```

Из `assignments` взять элементы:

```text
name = table -> value
name = domen -> value
```

Если нужен сразу готовый вывод:

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
group by we.id, we.name
having
  max(item->>'value') filter (where item->>'name' = 'table') is not null
  and max(item->>'value') filter (where item->>'name' = 'domen') is not null;
```

## Что должно быть в конце

Агент сообщает коротко:

- где найден `n8n`;
- куда сохранена резервная копия;
- какие workflow импортированы;
- какие значения `table` и `domen` перенесены;
- остались ли неподключенные credentials;
- какие workflow включены.
