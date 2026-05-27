# COMANDOS Hermes Installer

Это рабочая папка для установки COMANDOS Hermes на VPS.

Важно: пользователь сам создаёт папку `Hermes`, открывает её в агенте, и все файлы установщика лежат прямо здесь. Вложенную папку `Hermes/Hermes` создавать не надо.

## Что должно получиться

После установки пользователь получает:

- COMANDOS Workspace как единственную панель Hermes;
- Hermes Agent gateway;
- Telegram-обвязку, если заполнен токен бота;
- Telegram-роутер с голосовыми, inline-кнопками и маршрутизацией по Telegram ID, если заполнен токен бота;
- проверку лицензии COMANDOS;
- HTTPS через домен или `IP.nip.io`;
- пароль панели, сгенерированный системой;
- закреплённые версии без тихого автообновления;
- уведомления о новых версиях панели и Hermes Agent через COMANDOS manifest.

## Сценарий для видео

1. Создать папку `Hermes`.
2. Открыть эту папку в агенте.
3. Вставить в агента первый текст из `AGENT_COMMAND.md`.
4. Заполнить `comandos-hermes.env`.
5. Вставить в агента второй текст из `AGENT_COMMAND.md`.
6. Получить в конце:
   - URL панели;
   - пароль панели;
   - статус лицензии;
   - статус Telegram, если он включён;
   - статус Hermes gateway.

## Главные файлы

- `comandos-hermes.env.example` - шаблон настроек, пользователь копирует в `comandos-hermes.env`.
- `comandos-hermes.lock` - закреплённые версии и запрет автообновления.
- `AGENT_COMMAND.md` - готовые тексты, которые пользователь вставляет в агента.
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

## Ключи моделей

Для первого запуска достаточно одного ключа модели:

- `MINIMAX_API_KEY` - установщик выберет `minimax / MiniMax-M2.7`;
- `DEEPSEEK_API_KEY` - установщик выберет `deepseek / deepseek-chat`;
- `OPENAI_API_KEY` - установщик выберет `openai / gpt-5.4-mini`;
- `QWEN_API_KEY` - установщик выберет `qwen / qwen-max`.

Если нужно жёстко задать модель, заполните `DEFAULT_PROVIDER` и `DEFAULT_MODEL` в `comandos-hermes.env`.

## Доступ к VPS

В `comandos-hermes.env` нужно заполнить IP сервера и один способ входа.

Через SSH-ключ:

```env
ROOT_IP=1.2.3.4
ROOT_USER=root
SSH_KEY_PATH=~/.ssh/id_ed25519
ROOT_PASSWORD=
```

Через root-пароль:

```env
ROOT_IP=1.2.3.4
ROOT_USER=root
SSH_KEY_PATH=
ROOT_PASSWORD=...
```

Больше ничего для SSH обычно заполнять не нужно.

## Слабый VPS

Один vCPU для проверки подходит. Главный риск - память во время `pnpm install` и `pnpm build`.

Если на сервере меньше примерно 1.8 GB RAM и нет swap, установщик автоматически добавит swap-файл:

- путь: `/swapfile-comandos-hermes`;
- размер: `2G`;
- отключение: `COMANDOS_CREATE_SWAP=0`.

Это не ускоряет сервер, но снижает риск падения сборки на свежем дешёвом VPS.

## Главный сценарий через агента

Пользователь открывает пустую папку `Hermes` в агенте и вставляет первый текст из `AGENT_COMMAND.md`.

Агент сам выполнит:

```bash
curl -fsSL https://raw.githubusercontent.com/Comandosai/comandos-deploy-hub/main/stacks/hermes/install.sh | bash
```

После этого появится `comandos-hermes.env`. Пользователь заполняет параметры и вставляет второй текст из `AGENT_COMMAND.md`.

## Запасной сценарий через терминал

В пустой папке `Hermes`:

```bash
curl -fsSL https://raw.githubusercontent.com/Comandosai/comandos-deploy-hub/main/stacks/hermes/install.sh | bash
```

После заполнения `comandos-hermes.env`:

```bash
./deploy.sh
```

Лицензионный ключ пользователь вводит при входе в панель.
