# Comandos Supabase Stack

Production-oriented инсталлятор self-hosted Supabase под экосистему Comandos.

## Что это

`supabase-stack` — не просто `docker compose up`, а установщик, который:
- поднимает официальный Supabase Docker stack,
- адаптируется к окружению (Traefik / без Traefik, домен / без домена),
- снижает риск падений из-за логов и конфликтов портов,
- встраивается в ваш `n8n-stack-v2` (best-effort auto-credentials).

## Ключевые фишки

- Официальный стек Supabase:
  - используется `supabase/supabase` (`docker/`) как база,
  - не самодельный “урезанный compose”.

- Корректные ключи Supabase:
  - генерация через `utils/generate-keys.sh`,
  - валидные JWT `ANON_KEY` / `SERVICE_ROLE_KEY`.

- Два режима деплоя:
  - `public`: с доменом (интеграция с найденным Traefik),
  - `local`: без домена (Enter) на `http://<server-ip>:8000`.

- Устойчивость в mixed-окружениях:
  - автообход занятых портов (`POSTGRES_PORT`, `POOLER_PROXY_PORT_TRANSACTION`),
  - особенно полезно, когда на сервере уже есть n8n/Postgres.

- Нормальный UX на долгих шагах:
  - монотонный прогресс-бар на `pull`/`up`,
  - явные статусные блоки.

- Автообслуживание:
  - weekly systemd maintenance,
  - чистка тяжелых docker json-логов,
  - retention старых backup файлов.

- Best-effort интеграция с n8n:
  - если найден рабочий n8n API + `.bootstrap.env`,
  - автоматически создаются/обновляются credentials:
    - `Supabase Internal` (`supabaseApi`),
    - `Supabase Postgres` (`postgres`).
  - если n8n не найден, установка не падает.

## Быстрый запуск

```bash
curl -sSL https://raw.githubusercontent.com/Comandosai/comandos-deploy-hub/main/supabase-stack/setup.sh | sudo bash
```

Локально:

```bash
cd supabase-stack
sudo ./setup.sh
```

## Команды управления

```bash
./setup.sh                  # install/update
./setup.sh --stop           # stop stack
./setup.sh --logs           # follow logs
./setup.sh --backup         # manual postgres backup
./setup.sh --update         # backup + pull + up -d
./setup.sh --health         # smoke-check stack/API
./setup.sh --bootstrap-n8n  # rerun n8n credential bootstrap
```

## Что получает пользователь в конце

Инсталлятор печатает готовые блоки для copy/paste:

- `Supabase Credential (n8n -> Supabase node)`:
  - `Host`
  - `Service Role Secret`

- `Postgres Credential (n8n -> Postgres node)`:
  - `Host`
  - `Port`
  - `Database`
  - `User` (`postgres.<POOLER_TENANT_ID>`)
  - `Password`

Плюс:
- Studio URL + login/password,
- пути данных и backup директории.

## Примечания по n8n

- Для auto-bootstrap нужен доступ к n8n API и файл `.bootstrap.env`.
- Поиск `.bootstrap.env` выполняется по нескольким каталогам (`/root`, `/opt`, `/home`, `/srv`, `/data`, `/var/www`).
- Если bootstrap не отработал при установке n8n, credentials можно создать повторно через:

```bash
./setup.sh --bootstrap-n8n
```

## Compliance (RU, 152-ФЗ)

Если вы обрабатываете персональные данные граждан РФ, оцените применимость требований
152-ФЗ и связанных норм (включая локализацию ПДн) к вашему сценарию.

При необходимости размещайте инфраструктуру на серверах в РФ и согласуйте требования
с юристом/специалистом по ИБ.

Этот проект и скрипт не являются юридической консультацией.
