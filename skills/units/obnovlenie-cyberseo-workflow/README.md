# Обновление CyberSEO workflow

Этот скилл обновляет набор CyberSEO workflow в уже установленном `n8n` клиента.

Человек даёт только доступ к серверу. Дальше скилл сам:

- настраивает вход по SSH-ключу, если его ещё нет;
- находит `n8n` на сервере;
- делает резервную копию старых workflow;
- читает `table` и `domen` из старого `ВФ 0: МАСТЕР`;
- если точного имени нет, ищет любой workflow с узлом `Установка ID таблицы`;
- загружает новые workflow;
- связывает `ВФ 0`, `ВФ 1`, `ВФ 2`, `ВФ 3`, `ВФ 4`;
- переносит подключения;
- включает workflow по правилам версии `n8n`.

## Установка

```bash
curl -sSL https://raw.githubusercontent.com/Comandosai/comandos-deploy-hub/main/tools/skills.sh | bash -s -- install obnovlenie-cyberseo-workflow --client codex
```

## Запуск

Если SSH уже настроен алиасом:

```bash
python3 scripts/update_cyberseo_workflows.py --ssh-host Main
```

Если есть прямой доступ:

```bash
python3 scripts/update_cyberseo_workflows.py --ssh-host root@1.2.3.4
```

Проверка без замены:

```bash
python3 scripts/update_cyberseo_workflows.py --ssh-host root@1.2.3.4 --dry-run
```

## SSH-ключ

Если вход по ключу ещё не работает, скилл создаст локальный ключ:

```text
~/.ssh/ssh_server_<server>
```

После этого он напишет команду входа, например:

```bash
ssh -i ~/.ssh/ssh_server_root_1.2.3.4 root@1.2.3.4
```

Приватный ключ не печатается.

## Правило включения workflow

Для `n8n` 2.x и выше:

- `ВФ 0-4` публикуются;
- `ВФ 0-4` включаются.

Для `n8n` ниже 2.x:

- включается только `ВФ 0`;
- `ВФ 1-4` остаются выключенными.

`Узлы` не включается.

## Где лежат новые workflow

```text
assets/workflows
```

## Где искать table и domen

Не в `.env` и не в файлах сервера.

В живом `n8n` смотреть только:

```text
workflow_entity.nodes
узел: Установка ID таблицы
assignments: table, domen
```

В шаблоне это:

```text
assets/workflows/CyberSEO - ВФ 0_ МАСТЕР.json
строки 139-148: table и domen
строка 162: Установка ID таблицы
```

## Главный скрипт

```text
scripts/update_cyberseo_workflows.py
```
