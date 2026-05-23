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
- `OPENAI_API_KEY` или другой ключ модели;
- `TELEGRAM_BOT_TOKEN`

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

Автообновлений нет.

Обновление делаем только отдельной будущей командой после проверки новой версии:

```text
Обнови COMANDOS Hermes по новому lock-файлу и сохрани откат.
```
