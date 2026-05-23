# COMANDOS Hermes Installer Spec

## Задача

Развернуть на VPS рабочий COMANDOS Hermes так, чтобы пользователь не разбирался во внутренностях Hermes.

Пользователь делает только это:

1. создаёт папку `Hermes`;
2. открывает её в агенте;
3. скачивает файлы установщика в эту же папку;
4. заполняет `comandos-hermes.env`;
5. просит агента развернуть систему.

## Входные данные

Агент читает:

- `comandos-hermes.env`;
- `comandos-hermes.lock`.

Обязательные поля:

- `VPS_IP`;
- `SSH_AUTH_METHOD`;
- SSH-доступ через ключ или root/password;
- хотя бы один ключ модели;
- `TELEGRAM_BOT_TOKEN`.

Лицензионный ключ не является входным параметром развёртывания. Пользователь вводит его в веб-панели, а панель проверяет доступ через сервер лицензий COMANDOS.

## Логика домена

Если `DOMAIN` заполнен:

- Caddy слушает `DOMAIN`;
- выпускает HTTPS-сертификат;
- проксирует на `127.0.0.1:WORKSPACE_PORT`.

Если `DOMAIN` пустой:

- публичный адрес строится как `https://VPS_IP.nip.io`;
- Caddy выпускает HTTPS-сертификат для `VPS_IP.nip.io`;
- пользователь не настраивает DNS.

## Пароль панели

Если `HERMES_PASSWORD` пустой, установщик генерирует пароль сам:

- длина: 24 символа;
- алфавит: `A-Za-z0-9`;
- хранение: только на VPS в env панели;
- вывод: один раз в финальном отчёте.

## Что ставится на VPS

Минимальная схема:

```text
/opt/comandos/hermes/
  workspace/
  install/
  backups/
  logs/
```

Сервисы:

- `hermes-gateway.service`
- `comandos-workspace.service`
- `comandos-telegram.service`

Публично открыт только Caddy:

- `80/tcp`;
- `443/tcp`;
- SSH-порт из `SSH_PORT`.

Hermes gateway остаётся локальным:

```text
127.0.0.1:8642
```

Workspace остаётся локальным:

```text
127.0.0.1:3030
```

## Как ставить Workspace

Для публичной версии нельзя ставить из плавающей ветки.

Правильно:

1. взять источник из `comandos-hermes.lock`;
2. распаковать/скопировать в release-папку;
3. не переносить `.git`;
4. собрать `pnpm build`;
5. запускать `server-entry.js` через systemd.

Так пользователь не сможет случайно обновить Workspace из интерфейса.

## Как ставить Hermes Agent

На первом этапе допустимо использовать официальный installer, но агент обязан:

1. проверить итоговую версию;
2. зафиксировать её в отчёте;
3. не запускать `hermes update`;
4. не создавать автообновляющие timer/cron.

Перед публичным релизом нужен жёсткий способ установки по tag/commit.

## Env Workspace

На VPS в env панели должны быть:

```env
NODE_ENV=production
HOST=127.0.0.1
PORT=3030
COOKIE_SECURE=1
COMANDOS_SINGLE_PANEL=1
HERMES_API_URL=http://127.0.0.1:8642
HERMES_CLI_PATH=/home/clawd/.local/bin/hermes
HERMES_HOME=/home/clawd/.hermes
HERMES_PASSWORD=<generated-24-symbol-password>
COMANDOS_LICENSE_REQUIRED=1
COMANDOS_LICENSE_SERVER_URL=https://api.comandos.ai/v1/license/products
COMANDOS_LICENSE_SESSION_DAYS=14
```

## Проверки после установки

Агент обязан проверить:

```bash
systemctl is-active caddy
systemctl --user is-active hermes-gateway.service
systemctl --user is-active comandos-workspace.service
systemctl --user is-active comandos-telegram.service
curl -fsS http://127.0.0.1:8642/health
curl -fsSI https://PUBLIC_HOST/
```

Потом проверить лицензию и модельный ответ.

## Финальный вывод

Финальный ответ пользователю должен быть короткий:

```text
COMANDOS Hermes готов.
URL: https://...
Пароль панели: ...
Telegram: active
Hermes gateway: active
Workspace: active
Лицензия: проверяется при входе в панель
Автообновление: выключено
```
