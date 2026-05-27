# Команды для урока

## 1. Главная команда для агента

Пользователь создаёт папку `Hermes`, открывает её в агенте и вставляет:

```text
Подготовь COMANDOS Hermes в текущей папке.

Что нужно сделать:
1. Не создавай вложенную папку Hermes/Hermes. Работай строго в текущей папке.
2. Скачай установщик из GitHub:
   https://github.com/Comandosai/comandos-deploy-hub/tree/main/stacks/hermes
3. Для этого выполни:
   curl -fsSL https://raw.githubusercontent.com/Comandosai/comandos-deploy-hub/main/stacks/hermes/install.sh | bash
4. Убедись, что появился файл comandos-hermes.env.
5. Покажи мне коротко, какие поля нужно заполнить: доступ к VPS, ключи моделей, домен и Telegram при необходимости.
6. Не печатай в чат значения токенов, паролей и API-ключей.
```

После заполнения `comandos-hermes.env` пользователь вставляет:

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

Полная версия этих текстов лежит в `AGENT_COMMAND.md`.

## 2. Запасная команда для терминала

Пользователь уже находится в папке `Hermes`.

```bash
curl -fsSL https://raw.githubusercontent.com/Comandosai/comandos-deploy-hub/main/stacks/hermes/install.sh | bash
```

## 3. Заполнить настройки вручную

```bash
cp comandos-hermes.env.example comandos-hermes.env
open comandos-hermes.env
```

Минимально нужно заполнить:

- доступ к VPS: `ROOT_IP` и либо `SSH_KEY_PATH`, либо `ROOT_PASSWORD`;
- хотя бы один ключ модели: `MINIMAX_API_KEY`, `DEEPSEEK_API_KEY`, `OPENAI_API_KEY` или `QWEN_API_KEY`;

Если нужен Telegram-роутер, заполнить оба поля:

- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_USER_ID`

Лицензионный ключ пользователь вводит уже при входе в веб-панель.

## 4. Проверить настройки

```bash
bash scripts/check-config.sh comandos-hermes.env
```

## 5. Развёртывание через терминал

Команда:

```bash
./deploy.sh
```

## 6. Обновление

Тихих автообновлений нет.

Когда мы выпускаем новую проверенную версию в `update-manifest.json`, панель сама покажет уведомление:

- `Обновить панель`;
- `Обновить Hermes`.

Пользователь нажимает кнопку, а установленный `comandos-update.sh` делает backup и обновляет только проверенный COMANDOS-стек.

Если нужно попросить агента сделать это вручную:

```text
Обнови COMANDOS Hermes через встроенный comandos-update.sh и сохрани откат.
```
