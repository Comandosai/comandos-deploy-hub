# Стартеры

Стартер — это готовая папка проекта для урока или быстрого запуска.

Это не навык агента и не серверный стек. Стартер не добавляется в `registry/skills-index.json`.

## Telegram-парсер

Путь в репозитории:

```text
starters/telegram-parser/
```

Установка одной командой:

```bash
curl -sSL https://raw.githubusercontent.com/Comandosai/comandos-deploy-hub/main/tools/telegram-parser.sh | bash
```

Что делает команда:

1. Скачивает `comandos-deploy-hub`.
2. Копирует `starters/telegram-parser/` в локальную папку `telegram-parser-starter`.
3. Запускает `bash setup.sh`.
4. Создаёт `.venv`, `.env`, `sources.txt`, `sessions/`, `data/`, `logs/`.
5. Запускает `python scripts/auth.py`.

После входа в Telegram пользователь фиксирует задачу простыми словами через агента.

Пример задачи:

```text
Мне нужно собрать последние сообщения из закрытой группы, где я состою.
Помоги выбрать группу, сохранить её в sources.txt, собрать 100 последних сообщений и сделать отчёт:
главные темы, частые вопросы, боли участников и важные сообщения.
```

Следующие команды внутри проекта:

```bash
source .venv/bin/activate
python scripts/list_sources.py
python scripts/collect_history.py --limit 100
```

Если нужен анализ через DeepSeek, пользователь добавляет ключ в `.env`:

```text
DEEPSEEK_API_KEY=...
```

И запускает:

```bash
python scripts/analyze_deepseek.py
```

Личные файлы не коммитятся:

```text
.env
sources.txt
sessions/
data/
logs/
```
