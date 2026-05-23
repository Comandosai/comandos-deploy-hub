---
name: Развертывание COMANDOS Hermes
description: Готовит локальную папку Hermes, собирает параметры VPS в comandos-hermes.env, запускает установщик COMANDOS Hermes из deploy hub и проверяет рабочую панель, Hermes gateway, HTTPS и Telegram-обвязку. Использовать, когда пользователь хочет поставить COMANDOS Hermes с фирменной панелью на свой VPS.
---

# Развертывание COMANDOS Hermes

Этот навык нужен, чтобы пользователь не разбирался во внутренностях Hermes.

Цель: в текущей папке `Hermes` подготовить установщик, заполнить один файл параметров и развернуть на VPS:

- COMANDOS Workspace как основную панель;
- Hermes Agent gateway;
- HTTPS через домен или `IP.nip.io`;
- Telegram-обвязку;
- проверку лицензии при входе в панель;
- пароль панели, сгенерированный установщиком.

## Короткий сценарий

1. Пользователь создаёт папку `Hermes` и открывает её в агенте.
2. Агент скачивает файлы установщика:

```bash
curl -fsSL https://raw.githubusercontent.com/Comandosai/comandos-deploy-hub/main/stacks/hermes/install.sh | bash
```

3. Агент открывает `comandos-hermes.env` и просит заполнить только недостающие параметры.
4. Агент запускает проверку:

```bash
bash scripts/check-config.sh comandos-hermes.env
```

5. Агент запускает развёртывание:

```bash
./deploy.sh
```

## Важное про лицензию

Лицензионный ключ не нужно вписывать в `comandos-hermes.env`.

Пользователь вводит лицензионный ключ при входе в веб-панель. Панель сама делает запрос на сервер лицензий COMANDOS и сохраняет доступ в браузере на срок, заданный настройкой `COMANDOS_LICENSE_SESSION_DAYS`.

## Что спросить у пользователя

Спрашивать только то, чего нет в `comandos-hermes.env` и что нельзя определить автоматически:

- IP VPS;
- SSH-порт;
- SSH-пользователь и путь к ключу или root/password;
- домен, если пользователь хочет домен вместо `IP.nip.io`;
- минимум один ключ модели: OpenAI, DeepSeek, Qwen или MiniMax;
- Telegram bot token.

Не спрашивать лицензионный ключ на этапе развёртывания.

## Правила

- Не создавать вложенную папку `Hermes/Hermes`.
- Не коммитить `comandos-hermes.env`.
- Не показывать API-ключи и Telegram token в логах.
- Не запускать `hermes update`.
- Не включать автообновления.
- Не поднимать родную публичную панель Hermes отдельно от COMANDOS Workspace.
- Если `DOMAIN` пустой, использовать `https://VPS_IP.nip.io`.
- Если deploy упал, смотреть логи systemd и не писать пользователю “готово”.

## Проверка готовности

После `./deploy.sh` проверить:

```bash
curl -k -I https://<PUBLIC_HOST>/
```

На VPS проверить:

```bash
systemctl is-active caddy
systemctl --user is-active hermes-gateway.service
systemctl --user is-active comandos-workspace.service
systemctl --user is-active comandos-telegram.service
```

## Что должно быть в финальном ответе

Коротко:

```text
COMANDOS Hermes готов.

URL панели: ...
Пароль панели: ...
Лицензия: вводится при входе
Hermes gateway: active
Workspace service: active
Telegram bot: active
HTTPS: active
Автообновление: выключено
```

Если проверка не прошла, дать конкретную причину и следующую команду диагностики.

