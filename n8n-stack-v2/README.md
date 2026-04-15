# 🚀 n8n Stack v2: продовый деплой n8n 2.x без ручной рутины

Этот стек не просто поднимает `docker compose`, а автоматизирует полный цикл: 
**установка → миграция → интеграция с Traefik → пост-настройка n8n**.

## Что это за стек
`n8n-stack-v2` — установочный пакет для self-hosted n8n 2.x с очередями и воркером:
- `n8n` (main)
- `n8n-worker`
- `PostgreSQL 16`
- `Redis`
- `Traefik` (или интеграция с уже существующим)

## Фиксированный путь деплоя (правило)
Стек всегда разворачивается в один путь:
- `/root/n8n`

Это обязательное правило, чтобы не терять credentials/данные при обновлениях из-за разных директорий.

## Главная фишка
Главная идея стека: **инфраструктура сама адаптируется к окружению**.

То есть это не “вот compose, дальше руками”, а:
- определение существующего Traefik,
- подключение к общей сети,
- автонастройка маршрутов,
- запуск n8n c нужными параметрами для 2.x,
- автосоздание базовых credentials внутри n8n.
- единая модель reverse proxy без конфликта `file provider` и `docker labels`.

## Чем стек отличается от типовых README/инсталляторов

### 1) Реальная поддержка n8n 2.x архитектуры
Сразу выставляются параметры под Task Runners:
- `N8N_RUNNERS_MODE=internal`
- `N8N_TASK_BROKER_HOST=0.0.0.0`
- `EXECUTIONS_MODE=queue`

### 2) Умный апгрейд с n8n v1
Если уже есть старая установка:
- скрипт это обнаруживает,
- предлагает апгрейд,
- пытается восстановить существующий `encryptionKey`.

### 3) Модульная совместимость с другими стеками
Стек сделан под общую экосистему (`comandos-network`):
- корректно встраивается в уже существующий Traefik,
- может ставиться **до или после** других сервисов,
- сохраняет межсервисную связность через общую external-сеть.
- встроенный `Traefik` работает в одном согласованном режиме: маршруты `n8n` описываются через `file provider`, без фальшивых `docker labels`.

### 3.1) Корректная работа n8n за HTTPS reverse proxy
- автоматически выставляется `N8N_PROXY_HOPS=1` для схемы с одним proxy-hop;
- после деплоя выполняется smoke-test editor/API после рестарта;
- стек не считается готовым, если `n8n` теряет соединение из-за proxy misconfiguration.

### 4) Автопостнастройка n8n после деплоя
После старта выполняется bootstrap:
- owner setup (на первом запуске) или login,
- создание/обновление credentials:
  - `Postgres Internal`
  - `Redis Internal`

Это убирает ручной “первый час” настройки в UI.

### 5) Автоустановка community-нод (только ваши пакеты)
По умолчанию при пост-настройке ставятся только пакеты вашего npm-профиля:
- `https://www.npmjs.com/~comandos_ai`
- формат пакетов: `@comandosai/n8n-nodes-*`

Лишние публичные пакеты по умолчанию не устанавливаются.

### 6) Продовые дефолты
- воркер с управляемой конкурентностью (`N8N_WORKERS_CONCURRENCY`, по умолчанию `3`)
- ограничение env-доступа в Code node: `N8N_BLOCK_ENV_ACCESS_IN_NODE=true`
- автоматическая генерация секретов
- защита от drift секретов: пароль `n8n` в `.env` синхронизируется с ролью в `Postgres`
- опциональный monthly auto-update через `systemd timer`

### 7) Weekly sync community-нод из npm
Опционально можно включить авто-синхронизацию из профиля:
- `https://www.npmjs.com/~comandos_ai`

Что делает синк:
- ищет пакеты автора `comandos_ai` (`@comandosai/n8n-nodes-*` и `n8n-nodes-*`),
- ставит новые пакеты,
- для уже установленных выполняет update до последней версии.

Запускается по `systemd timer` раз в неделю (воскресенье, 05:00).

## Команды для пользователей

### Одна универсальная команда (установка или обновление)
```bash
bash -c 'set -e; cd /root; [ -d /root/comandos-deploy-hub/.git ] || git clone git@github.com:Comandosai/comandos-deploy-hub.git /root/comandos-deploy-hub; cd /root/comandos-deploy-hub; git pull --ff-only origin main; cd n8n-stack-v2; chmod +x setup.sh; sudo ./setup.sh'
```

### Установка с нуля
```bash
cd /root
git clone git@github.com:Comandosai/comandos-deploy-hub.git
cd /root/comandos-deploy-hub/n8n-stack-v2
sudo ./setup.sh
```

После запуска все рабочие файлы будут в `/root/n8n`.

### Обновление существующего стека
```bash
cd /root/comandos-deploy-hub
git pull --ff-only origin main
cd /root/comandos-deploy-hub/n8n-stack-v2
sudo ./setup.sh
```

На апдейте выбирайте использование существующих настроек (домен/ключи/пароли), чтобы пройти обновление без ручной перенастройки.
Скрипт обязан сохранить существующие `workflow`, `credentials`, `variables`, `project sharing` и пользовательский стейт. Если этого не удаётся гарантировать, обновление должно считаться неуспешным.

## Что обновляется автоматически
- Postgres запускается на образе `pgvector/pgvector:pg16`.
- После старта стек автоматически применяет:
  - `CREATE EXTENSION IF NOT EXISTS vector;`
  - создание таблицы `public.comandos_embeddings` (если её нет)
  - создание индекса `comandos_embeddings_created_at_idx` (если его нет)
- Старые данные в `postgres_data/` сохраняются, миграция выполняется идемпотентно.
- После старта также проверяется:
  - доступность `n8n` по HTTPS;
  - повторный запуск `n8n` после рестарта;
  - совпадение пароля роли `n8n` в `Postgres` с текущим `.env`.

## Быстрый старт
```bash
cd /root/comandos-deploy-hub/n8n-stack-v2
sudo ./setup.sh
```

## Команды управления
- `./setup.sh --stop` — остановить стек
- `./setup.sh --logs` — смотреть логи n8n
- `./setup.sh --sync-nodes` — ручной запуск синхронизации community-нод

## Автоустановка community-нод
Создайте файл `custom/community-nodes.txt` и добавьте по одному npm-пакету на строку:

```txt
# one package per line
@comandosai/n8n-nodes-media
@comandosai/n8n-nodes-doc-extract
```

Важно: `custom/community-nodes.txt` — это ручной override-список. Добавляйте туда только нужные пакеты, иначе скрипт поставит все, что указано в файле.

## Еженедельная синхронизация (npm профиль)
При установке скрипт может включить weekly sync community-нод из профиля `comandos_ai`.

Технически:
- создаётся systemd unit: `n8n-community-sync.service`
- создаётся timer: `n8n-community-sync.timer`
- лог обновлений: `/var/log/n8n-community-sync.log`

## Структура данных
- `/root/n8n/n8n_data/` — данные n8n (workflow, credentials, config)
- `/root/n8n/postgres_data/` — база PostgreSQL
- `/root/n8n/redis_data/` — Redis
- `/root/n8n/output/` — общая файловая папка (доступна в n8n как `/data/output`)

## Для поста (готовый тезис)
Если нужно описать коротко:

> `n8n-stack-v2` — это не шаблон compose, а “self-healing” инсталлятор n8n 2.x: 
> сам подхватывает Traefik/сеть, мигрирует старую версию, поднимает queue+worker архитектуру 
> и сразу подготавливает рабочую среду (credentials + community nodes) после деплоя.

## Лицензия
MIT
