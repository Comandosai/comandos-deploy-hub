# COMANDOS Hermes Installer

Это рабочая папка для установки COMANDOS Hermes на VPS.

Важно: пользователь сам создаёт папку `Hermes`, открывает её в агенте, и все файлы установщика лежат прямо здесь. Вложенную папку `Hermes/Hermes` создавать не надо.

## Что должно получиться

После установки пользователь получает:

- COMANDOS Workspace как единственную панель Hermes;
- Hermes Agent gateway;
- Telegram-обвязку;
- Telegram-роутер с голосовыми, inline-кнопками и маршрутизацией по Telegram ID;
- проверку лицензии COMANDOS;
- HTTPS через домен или `IP.nip.io`;
- пароль панели, сгенерированный системой;
- закреплённые версии без тихого автообновления;
- уведомления о новых версиях панели и Hermes Agent через COMANDOS manifest.

## Сценарий для видео

1. Создать папку `Hermes`.
2. Открыть эту папку в агенте.
3. Выполнить команду подготовки из `COMMANDS.md`.
4. Заполнить `comandos-hermes.env`.
5. Выполнить команду развёртывания из `COMMANDS.md`.
6. Получить в конце:
   - URL панели;
   - пароль панели;
   - статус лицензии;
   - статус Telegram;
   - статус Hermes gateway.

## Главные файлы

- `comandos-hermes.env.example` - шаблон настроек, пользователь копирует в `comandos-hermes.env`.
- `comandos-hermes.lock` - закреплённые версии и запрет автообновления.
- `AGENTS.md` - инструкция для агента, который разворачивает Hermes.
- `COMMANDS.md` - команды для видео и будущего урока.
- `docs/INSTALLER_SPEC.md` - технический контракт установщика.
- `docs/UPDATE_POLICY.md` - как фиксируем версии и почему не даём автообновление.
- `scripts/check-config.sh` - локальная проверка заполненного env.
- `scripts/generate-panel-password.sh` - генератор 24-символьного пароля.
- `update-manifest.json` - источник правды для уведомлений об обновлениях.
- `templates/update/comandos-update.sh` - управляемое обновление панели и Hermes Agent.
- `templates/telegram/router.py` - Telegram-роутер Hermes.

## Быстрая проверка

```bash
cp comandos-hermes.env.example comandos-hermes.env
open comandos-hermes.env
bash scripts/check-config.sh comandos-hermes.env
```

Пока `comandos-hermes.env` не заполнен, проверка должна показать, каких полей не хватает.

## Публичная команда подготовки

В пустой папке `Hermes`:

```bash
curl -fsSL https://raw.githubusercontent.com/Comandosai/comandos-deploy-hub/main/stacks/hermes/install.sh | bash
```

После заполнения `comandos-hermes.env`:

```bash
./deploy.sh
```

Лицензионный ключ пользователь вводит при входе в панель.
