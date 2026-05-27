# Команды для агента

Эти тексты можно вставлять прямо в AI-агента, открытого в пустой папке `Hermes`.

## 1. Подготовить файлы установщика

```text
Подготовь COMANDOS Hermes в текущей папке.

Что нужно сделать:
1. Не создавай вложенную папку Hermes/Hermes. Работай строго в текущей папке.
2. Скачай установщик из GitHub:
   https://github.com/Comandosai/comandos-deploy-hub/tree/main/stacks/hermes
3. Для этого выполни:
   curl -fsSL https://raw.githubusercontent.com/Comandosai/comandos-deploy-hub/main/stacks/hermes/install.sh | bash
4. Убедись, что появился файл comandos-hermes.env.
5. Покажи мне коротко, какие поля нужно заполнить: SSH-доступ, ключи моделей, домен и Telegram при необходимости.
6. Не печатай в чат значения токенов, паролей и API-ключей.
```

После этого пользователь заполняет `comandos-hermes.env`.

Минимально нужны:

- SSH-доступ. Самый простой вариант: `SSH_AUTH_METHOD=ssh_config` и `SSH_HOST_ALIAS=clawd`, если команда `ssh clawd` уже работает на локальной машине;
- хотя бы один ключ модели: `MINIMAX_API_KEY`, `DEEPSEEK_API_KEY`, `OPENAI_API_KEY` или `QWEN_API_KEY`.

Необязательно:

- `DOMAIN`, если есть свой домен;
- `VPS_IP`, если не используете SSH alias;
- `TELEGRAM_BOT_TOKEN` и `TELEGRAM_USER_ID`, если нужен Telegram;
- `DEFAULT_PROVIDER` и `DEFAULT_MODEL`, если модель нужно задать вручную.

Лицензионный ключ COMANDOS по умолчанию не кладём в файл. Его пользователь вводит в панели после установки.

## 2. Развернуть на VPS

```text
Разверни COMANDOS Hermes на VPS по файлу comandos-hermes.env.

Что нужно сделать:
1. Проверь настройки:
   bash scripts/check-config.sh comandos-hermes.env
2. Если проверка прошла, запусти:
   ./deploy.sh
3. Если проверка упала, покажи только список незаполненных или неверных полей. Секреты не печатай.
4. После установки отчитайся коротко:
   - URL панели;
   - пароль панели;
   - какая модель выбрана;
   - Telegram включён или нет;
   - Hermes gateway отвечает или нет.
```

## 3. Обновить установленную панель

```text
Обнови COMANDOS Hermes через встроенный comandos-update.sh.

Перед обновлением проверь, какая версия установлена и какая доступна.
Не делай откат на более старую версию.
После обновления проверь, что панель и Hermes gateway отвечают.
```
