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
- `TELEGRAM_BOT_TOKEN`;
- `TELEGRAM_USER_ID`.

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

Telegram-роутер работает как user systemd service `comandos-telegram.service`.
Он не открывает дополнительный публичный порт, а ходит в Telegram через long polling.

Встроенные возможности роутера:

- маршрутизация `Telegram ID -> Hermes profile`;
- поддержка нескольких Telegram-ботов на одном Hermes;
- голосовые сообщения через локальный `faster-whisper`;
- inline-кнопки через блок `[[telegram_buttons]]`;
- Telegram HTML-форматирование вместо сырых `**звёздочек**`;
- публичный guard, чтобы бот не показывал пользователю пути, токены и внутренние профили без явного режима настройки.

## Как ставить Workspace

Для публичной версии нельзя ставить из плавающей ветки.

Правильно:

1. взять источник из `comandos-hermes.lock`;
2. распаковать/скопировать в release-папку;
3. не переносить `.git`;
4. собрать `pnpm build`;
5. запускать `server-entry.js` через systemd.

Так пользователь не сможет случайно обновить Workspace из upstream. Рабочая кнопка обновления допустима только через `COMANDOS_UPDATE_MANIFEST_URL` и установленный `comandos-update.sh`.

## Как ставить Hermes Agent

На первом этапе допустимо использовать официальный installer, но агент обязан:

1. проверить итоговую версию;
2. зафиксировать её в отчёте;
3. не запускать `hermes update`;
4. не создавать автообновляющие timer/cron.

Обновление Hermes Agent должно идти только через проверенный ref из `update-manifest.json` и lock-файла.

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
COMANDOS_WORKSPACE_VERSION=2.3.0-komandos.3
COMANDOS_HERMES_AGENT_REF=87d9239
COMANDOS_UPDATE_MANIFEST_URL=https://raw.githubusercontent.com/Comandosai/comandos-deploy-hub/main/stacks/hermes/update-manifest.json
COMANDOS_UPDATE_SCRIPT=/opt/comandos/hermes/install/comandos-update.sh
COMANDOS_INSTALLED_STATE=/opt/comandos/hermes/workspace/.runtime/comandos-installed.json
COMANDOS_STACK_REPO_URL=https://github.com/Comandosai/comandos-deploy-hub.git
COMANDOS_STACK_REF=main
COMANDOS_STACK_PATH=stacks/hermes
```

## Env Telegram

На VPS в env Telegram-роутера должны быть:

```env
TELEGRAM_BOT_TOKEN=<bot-token>
TELEGRAM_BOT_TOKEN_SECOND=
TELEGRAM_ALLOWED_USERS=
COMANDOS_WORKSPACE_URL=https://PUBLIC_HOST
```

Роуты профилей хранятся в `/opt/comandos/hermes/telegram/config.json`.
На первом уроке установщик создаёт только один маршрут: `TELEGRAM_USER_ID -> default`.

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
Уведомления об обновлениях: включены
```
