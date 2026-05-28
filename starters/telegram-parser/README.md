# Telegram Parser Starter

Готовая основа для урока: подключаем Telegram-аккаунт, выбираем каналы или группы, собираем сообщения и делаем выжимку.

Это не готовый продукт под одну задачу. Это заготовка, которую агент помогает быстро переделать под вашу цель: новости, конкуренты, закрытые группы, база людей, комментарии, медиа, отчёты.

## Что внутри

- `setup.sh` — установка зависимостей.
- `src/tg_parser/defaults.py` — встроенный `api_id/api_hash` Telegram.
- `scripts/auth.py` — авторизация Telegram-сессии через Telethon.
- `scripts/list_sources.py` — список чатов, каналов и групп, доступных аккаунту.
- `scripts/collect_history.py` — сбор истории сообщений.
- `scripts/watch_live.py` — постоянный сбор новых сообщений.
- `scripts/analyze_deepseek.py` — выжимка по собранным сообщениям через DeepSeek.
- `START_PROMPT.md` — стартовый промпт для агента.
- `TASK_EXAMPLES.md` — примеры задач, которые можно дать агенту.

## Быстрый старт

Установка из `comandos-deploy-hub` одной командой:

```bash
curl -sSL https://raw.githubusercontent.com/Comandosai/comandos-deploy-hub/main/tools/telegram-parser.sh | bash
```

Если проект уже скачан:

```bash
cd telegram-parser-starter
bash setup.sh
```

Обычно `.env` трогать не нужно: Telegram `api_id/api_hash` уже лежат в конфиге проекта.

Если надо заменить их на свои, раскомментируйте в `.env`:

```bash
TELEGRAM_API_ID=...
TELEGRAM_API_HASH=...
```

Авторизуйтесь:

```bash
source .venv/bin/activate
python scripts/auth.py
```

Посмотрите доступные источники:

```bash
python scripts/list_sources.py
```

Добавьте нужные каналы или группы в `sources.txt`.

Можно указывать всю группу, конкретную ветку/топик или ключевые слова:

```text
@channelname
-1001234567890
-1001234567890 | topic=456
https://t.me/c/1234567890/456/789
@groupname | keywords=заявка,срочно,ошибка
```

Соберите последние сообщения:

```bash
python scripts/collect_history.py --limit 500
```

Повторный запуск создаёт файлы заново. Если нужно дописывать в старые файлы:

```bash
python scripts/collect_history.py --limit 500 --append
```

Результаты появятся в:

- `data/messages.jsonl`
- `data/messages.csv`

Если есть ключ DeepSeek, сделайте выжимку:

```bash
python scripts/analyze_deepseek.py
```

Отчёт появится в `data/report.md`.

## Live-сбор

Чтобы слушать новые сообщения 24/7:

```bash
python scripts/watch_live.py
```

Новые сообщения будут писаться в:

- `data/live_messages.jsonl`
- `data/live_messages.csv`

Если в `sources.txt` указан `topic=...` или `keywords=...`, live-сбор будет сохранять только подходящие сообщения.

## Как использовать в уроке

1. Открываете агента.
2. Вставляете текст из `START_PROMPT.md`.
3. Если нужен анализ через DeepSeek, агент помогает добавить ключ в `.env`.
4. Запускаете авторизацию.
5. Выбираете закрытую группу или каналы.
6. При необходимости ограничиваете сбор веткой/топиком или ключевыми словами.
7. Собираете сообщения.
8. Делаете выжимку или меняете задачу под себя.

## Важно

Работайте только с теми чатами и каналами, куда у вашего аккаунта есть доступ. Не публикуйте чужие личные данные без разрешения.

Файлы `.env`, `sources.txt`, `sessions/`, `data/` и `logs/` не коммитятся. Там будут личные настройки, Telegram-сессия и собранные данные.
