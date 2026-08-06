# Telegram

Цель: подключить Telegram-бота к отделу продаж и провести живой тест готовыми скриптами пакета. Старый `telegram-testirovanie-bota`, n8n test workflow и `06_WF_Test` здесь не используются.

## 1. Подключить бота

1. Попросить пользователя открыть `@BotFather`.
2. Если бота нет, создать через `/newbot`.
3. Скопировать bot token.
4. Вставить token в COMANDOS ОС -> Отдел продаж -> Telegram.
5. Нажать `Подключить`.
6. Проверить, что кабинет показывает имя бота.

Bot token вводится только в кабинете. Не печатать его полностью и не сохранять в roadmap, state, notes или shell history.

## 2. Подготовить локальное окружение теста

В рабочей папке текущего запуска выполнить:

```bash
SKILL_DIR="${CODEX_HOME:-$HOME/.codex}/skills/zapusk-otdela-prodazh-os"
python3 -m venv .comandos_os/venv
source .comandos_os/venv/bin/activate
python -m pip install -r "$SKILL_DIR/scripts/requirements.txt"
```

Папка `.comandos_os/` локальная. Не коммитить ее, `.session`, тестовые диалоги и отчеты.

## 3. Найти существующую user-сессию

Сначала выполнить готовую проверку:

```bash
python "$SKILL_DIR/scripts/telegram_session_doctor.py" \
  --project-dir "$PWD" \
  --json
```

По умолчанию скрипт ищет только внутри текущей распаковки:

1. `.comandos_os/`;
2. `.state/`;
3. `sessions/`;
4. корень текущего проекта.

Если `found: true`, использовать `selected_session`. Не копировать и не открывать содержимое `.session`.

Чужую или общую сессию автоматически не подхватывать. Если пользователь явно разрешил использовать конкретную папку, передать ее отдельным `--search-root`. Иначе при `found: false` создать отдельную сессию текущей установки.

## 4. Создать сессию, если ее нет

Если подходящая сессия не найдена, выполнить:

```bash
python "$SKILL_DIR/scripts/login_telethon_session.py" \
  --session-path "$PWD/.comandos_os/telegram_userbot.session" \
  --lang-code ru \
  --system-lang-code ru-RU
```

Скрипт сам спросит в терминале:

1. Telegram API ID и API hash, если их нет в `TELEGRAM_API_ID` и `TELEGRAM_API_HASH`;
2. номер телефона;
3. код Telegram;
4. пароль 2FA, если он включен.

API ID/hash берутся из `my.telegram.org`, это не bot token. Номер, код, 2FA и API hash не записываются в файлы. Новая сессия получает права `600`.

Параметры `lang_code=ru` и `system_lang_code=ru-RU` обязательны для создания новой сессии: это рабочая конфигурация, с которой код входа приходил стабильно в проверенном локальном сценарии.

## 5. Подготовить сценарий из подтвержденных данных

Скопировать шаблон в локальную закрытую папку:

```bash
cp "$SKILL_DIR/templates/telegram_smoke_scenario.template.json" \
  .comandos_os/telegram_smoke_scenario.json
```

Заменить все `[placeholders]` только фактами из подтвержденных `company_brief.md` и `field_plan.md`. Не выдумывать бизнес, боль, обязательные данные или контакты. Скрипт откажется запускаться, пока в сообщениях остались квадратные скобки.

## 6. Запустить живой тест

Запускать только после отдельной команды пользователя, готовых prompts и подтвержденного сценария:

```bash
python "$SKILL_DIR/scripts/telegram_os_smoke.py" \
  --session-path "$PWD/.comandos_os/telegram_userbot.session" \
  --target-bot "@BOT_USERNAME" \
  --scenario-file "$PWD/.comandos_os/telegram_smoke_scenario.json" \
  --log-path "$PWD/.comandos_os/telegram_smoke.json"
```

Если `telegram_session_doctor.py` выбрал другую сессию, передать ее путь в `--session-path`.

Скрипт отправляет сообщения строго по порядку, после каждого ждёт ответ бота и сохраняет локальный отчет с правами `600`. Он не использует bot token и не меняет webhook.

## 7. Проверить результат в COMANDOS ОС

- Бот подключен именно в кабинете текущего пользователя.
- В кабинете появился новый тестовый лид и вся история диалога.
- Квалификатор не перешел к консультации до сбора обязательных фактов.
- Ответы короткие, живые и опираются на brief/базу знаний.
- Handoff создал карточку человеку, если это включено.
- Если CRM подключена, новая сделка/контакт/примечание созданы или обновлены без дублей.

Только после этой проверки поставить `telegram.user_session_ready=true`, `telegram.smoke_test_passed=true` и записать относительные пути локального сценария/отчета в `LAUNCH_STATE.json`.

## Ошибки

- Сессия не найдена: запустить `login_telethon_session.py`.
- Код не приходит: убедиться, что новая сессия создается с `ru` и `ru-RU`; не запрашивать код много раз подряд.
- Сессия не авторизована: создать отдельный новый файл, старый не перезаписывать.
- `telegram_webhook_already_configured`: это проблема подключения bot token в кабинете, а не Telethon-сессии. Сначала исправить подключение бота, затем запускать smoke-test.
- Нет ответа за отведенное время: отчет не считать успешным, проверить состояние бота и повторить после устранения причины.
