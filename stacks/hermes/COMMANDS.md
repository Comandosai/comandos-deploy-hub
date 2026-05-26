# Команды для урока

## 1. Подготовка папки

Пользователь уже находится в папке `Hermes`.

Будущая публичная команда будет такой:

```bash
curl -fsSL https://raw.githubusercontent.com/Comandosai/comandos-deploy-hub/main/stacks/hermes/install.sh | bash
```

## 2. Заполнить настройки

```bash
cp comandos-hermes.env.example comandos-hermes.env
open comandos-hermes.env
```

Минимально нужно заполнить:

- `VPS_IP`
- способ SSH-доступа;
- хотя бы один ключ модели: `MINIMAX_API_KEY`, `DEEPSEEK_API_KEY`, `OPENAI_API_KEY` или `QWEN_API_KEY`;

Если нужен Telegram-роутер, заполнить оба поля:

- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_USER_ID`

Лицензионный ключ пользователь вводит уже при входе в веб-панель.

## 3. Проверить настройки

```bash
bash scripts/check-config.sh comandos-hermes.env
```

## 4. Развёртывание агентом

Команда:

```bash
./deploy.sh
```

## 5. Обновление

Тихих автообновлений нет.

Когда мы выпускаем новую проверенную версию в `update-manifest.json`, панель сама покажет уведомление:

- `Обновить панель`;
- `Обновить Hermes`.

Пользователь нажимает кнопку, а установленный `comandos-update.sh` делает backup и обновляет только проверенный COMANDOS-стек.

Если нужно попросить агента сделать это вручную:

```text
Обнови COMANDOS Hermes через встроенный comandos-update.sh и сохрани откат.
```
