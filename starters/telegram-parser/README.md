# Telegram Parser Starter

Готовая основа для урока: подключаем Telegram-аккаунт, выбираем каналы или группы, собираем сообщения и делаем выжимку.

Это не готовый продукт под одну задачу. Это заготовка, которую агент помогает быстро переделать под вашу цель: новости, конкуренты, закрытые группы, база людей, комментарии, медиа, отчёты.

## GitHub / push

- Публичная версия: `Comandosai/comandos-deploy-hub`, папка `starters/telegram-parser`.
- Основная ветка: `main`.
- Реальные `.env`, `sessions/`, `data/`, `logs/` и `sources.txt` в GitHub не попадают.

## Таблицы БД

- БД: не используется по умолчанию.
- Парсер пишет локальные файлы в `data/`.
- Если добавляется запись в Postgres, таблицы нужно сначала описать в этом README.

## Что внутри

- `setup.sh` — установка зависимостей.
- `scripts/auth.py` — авторизация Telegram-сессии через Telethon.
- `scripts/list_sources.py` — список чатов, каналов и групп, доступных аккаунту.
- `scripts/collect_history.py` — сбор истории сообщений.
- `scripts/watch_live.py` — постоянный сбор новых сообщений.
- `scripts/extract_markdown.py` — извлечение текста из документов в Markdown через MarkItDown.
- `scripts/analyze_deepseek.py` — выжимка по собранным сообщениям через DeepSeek.
- `scripts/check_bot.py` — проверка Telegram-бота для уведомлений.
- `START_PROMPT.md` — стартовый промпт для агента.
- `RUN_WITH_AGENT.md` — инструкция агенту для настройки сессии и запуска задачи.
- `TASK_EXAMPLES.md` — примеры задач, которые можно дать агенту.

## Быстрый старт

### Вариант 1. Вставить в ИИ-агента

Скопируйте этот текст и отправьте ИИ-агенту:

```text
Скачай и подготовь Telegram-парсер.

Выполни в терминале:

curl -sSL https://raw.githubusercontent.com/Comandosai/comandos-deploy-hub/main/tools/telegram-parser.sh | bash

Когда терминал попросит телефон, спроси его у меня и передай в терминал.
Телефон вводится в международном формате, например +78001234567.
Когда Telegram пришлёт код, спроси код у меня и передай в терминал.
Если Telegram попросит пароль 2FA, спроси его у меня и передай в терминал.

После успешной авторизации перейди в папку telegram-parser-starter, прочитай RUN_WITH_AGENT.md и START_PROMPT.md.
Проверь, что сессия создана внутри папки sessions/.
Если я уже дал задачу, начни её выполнять.
Если задачи ещё нет, спроси: "Что будем собирать и анализировать?"
```

### Вариант 2. Запустить самому в терминале

Установка из `comandos-deploy-hub` одной командой:

```bash
curl -sSL https://raw.githubusercontent.com/Comandosai/comandos-deploy-hub/main/tools/telegram-parser.sh | bash
```

Если проект уже скачан:

```bash
cd telegram-parser-starter
bash setup.sh
```

Получите Telegram API ID и API Hash в `my.telegram.org` и заполните локальный `.env`:

```bash
TELEGRAM_API_ID=...
TELEGRAM_API_HASH=...
```

Не публикуйте эти значения и не переносите `.env` в Git.

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

Если нужно забирать документы и сразу получать Markdown-слой для анализа, включите в `.env`:

```bash
DOWNLOAD_MEDIA=true
EXTRACT_MARKDOWN=true
MARKDOWN_OUTPUT_DIR=data/analysis/markitdown
```

После этого у сообщений с документами появятся поля `markdown_path`, `markdown_status`, `markdown_parser`, `markdown_error`, `markdown_chars`.

Для уже скачанных файлов можно запустить конвертацию отдельно:

```bash
python scripts/extract_markdown.py --input data/media
```

Markdown-файлы и отчёт появятся в `data/analysis/markitdown`.

Если есть ключ DeepSeek, сделайте выжимку:

```bash
python scripts/analyze_deepseek.py
```

Отчёт появится в `data/report.md`.

## Уведомления в Telegram-бота

Парсер может присылать важные сообщения и отчёты в вашего Telegram-бота.

1. Создайте бота через `@BotFather`.
2. Напишите своему боту `/start`.
3. Добавьте токен в `.env`:

```text
TELEGRAM_BOT_TOKEN=123456:ABC...
```

4. Найдите свой `chat_id`:

```bash
python scripts/check_bot.py
```

5. Добавьте `chat_id` в `.env`:

```text
TELEGRAM_NOTIFY_CHAT_IDS=123456789
TELEGRAM_BOT_PARSE_MODE=HTML
```

Можно указать несколько получателей через запятую:

```text
TELEGRAM_NOTIFY_CHAT_IDS=123456789,987654321
```

После этого `watch_live.py` будет отправлять HTML-уведомления по подходящим сообщениям, а `analyze_deepseek.py` будет отправлять готовый отчёт.

## Live-сбор

Чтобы слушать новые сообщения 24/7:

```bash
python scripts/watch_live.py
```

Новые сообщения будут писаться в:

- `data/live_messages.jsonl`
- `data/live_messages.csv`

Если в `sources.txt` указан `topic=...` или `keywords=...`, live-сбор будет сохранять только подходящие сообщения.
Если заполнены `TELEGRAM_BOT_TOKEN` и `TELEGRAM_NOTIFY_CHAT_IDS`, эти сообщения также будут приходить в вашего Telegram-бота.

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
