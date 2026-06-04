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
4. Убедись, что появились файлы comandos-hermes.env и comandos-hermes.env.example.
5. Покажи мне коротко, какие поля нужно заполнить: доступ к VPS, ключи моделей, домен и Telegram при необходимости.
6. Не печатай в чат значения токенов, паролей и API-ключей.
```

После этого пользователь заполняет `comandos-hermes.env`.
Если в видео или уроке пользователь уже заполнил `comandos-hermes.env.example`, это тоже нормально: `./deploy.sh` сам возьмёт example, если основной файл ещё пустой.

Минимально нужны:

- доступ к VPS: `ROOT_IP` и либо `SSH_KEY_PATH`, либо `ROOT_PASSWORD`;
- хотя бы один ключ модели: `MINIMAX_API_KEY`, `DEEPSEEK_API_KEY`, `OPENAI_API_KEY` или `QWEN_API_KEY`.

Необязательно:

- `DOMAIN`, если есть свой домен;
- `TELEGRAM_BOT_TOKEN` и `TELEGRAM_USER_ID`, если нужен Telegram;
- `DEFAULT_PROVIDER` и `DEFAULT_MODEL`, если модель нужно задать вручную.

Лицензионный ключ COMANDOS по умолчанию не кладём в файл. Его пользователь вводит в панели после установки.

## 2. Развернуть на VPS

```text
Разверни COMANDOS Hermes на VPS по заполненному файлу comandos-hermes.env или comandos-hermes.env.example.

Что нужно сделать:
1. Сначала проверь основной файл:
   bash scripts/check-config.sh comandos-hermes.env
2. Если основной файл не заполнен, но пользователь заполнил `comandos-hermes.env.example`, проверь example:
   bash scripts/check-config.sh comandos-hermes.env.example
3. Если прошёл хотя бы один из этих файлов, запусти:
   ./deploy.sh
4. Если проверка упала, покажи только список незаполненных или неверных полей. Секреты не печатай.
5. После установки отчитайся коротко:
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
