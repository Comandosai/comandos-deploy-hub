# Comandos Supabase Stack

Установочный стек Supabase в стиле Comandos:
- корректная генерация ключей Supabase (JWT-ключи ANON/SERVICE_ROLE),
- режим с доменом и без домена,
- weekly maintenance (чистка docker/journal логов + retention backup),
- best-effort автосоздание credentials в n8n (если n8n обнаружен).

## Быстрый запуск

```bash
curl -sSL https://raw.githubusercontent.com/Comandosai/comandos-deploy-hub/main/supabase-stack/setup.sh | sudo bash
```

или локально:

```bash
cd supabase-stack
sudo ./setup.sh
```

## Режимы установки

- С доменом: вводите домен и email. Если обнаружен Traefik, добавляется HTTPS-роут.
- Без домена: нажмите Enter на запросе домена, стек поднимется в local-режиме на `http://<server-ip>:8000`.

## Команды управления

```bash
./setup.sh            # установка/обновление
./setup.sh --stop     # остановка
./setup.sh --logs     # логи
./setup.sh --backup   # backup postgres
./setup.sh --update   # backup + pull + up -d
./setup.sh --health   # smoke-check
```

## Что выводится в конце

- URL Supabase/Studio,
- IP сервера,
- данные Postgres (host/port/db/user/password),
- `ANON_KEY` и `SERVICE_ROLE_KEY`,
- путь данных и путь backup.

## Примечания

- Скрипт не падает, если n8n отсутствует: просто пишет, что интеграция пропущена.
- Для n8n auto-credentials требуется доступ к n8n API и найденный `.bootstrap.env`.

## Compliance (RU, 152-ФЗ)

Если вы обрабатываете персональные данные граждан РФ, оцените применимость требований
152-ФЗ и связанных норм (включая локализацию ПДн) к вашему сценарию.

При необходимости размещайте инфраструктуру на серверах в РФ и согласуйте требования
с юристом/специалистом по ИБ.

Этот проект и скрипт не являются юридической консультацией.
