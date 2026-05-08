# Полный запуск CyberSEO

Этот файл нужен, чтобы запускать CyberSEO по шагам через ИИ-агента.

## Установка навыка

Вставь агенту:

```text
Установи навык CyberSEO из GitHub.

Репозиторий:
https://github.com/Comandosai/comandos-deploy-hub

Ветка:
codex/cyberseo-skills

Навык:
cyberseo-full

Если можешь выполнять команды в терминале, выполни:
BRANCH=codex/cyberseo-skills bash <(curl -fsSL https://raw.githubusercontent.com/Comandosai/comandos-deploy-hub/codex/cyberseo-skills/tools/skills.sh) install cyberseo-full ~/.codex/skills --client codex

После установки открой cyberseo-full/README.md, потом cyberseo-full/SKILL.md и дальше работай по командам из README.
```

После слияния ветки в `main` команда установки будет такой:

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/Comandosai/comandos-deploy-hub/main/tools/skills.sh) install cyberseo-full ~/.codex/skills --client codex
```

Для другого агента поменяй только клиент:

```text
--client claude
--client gemini
--client antigravity
```

## Команда 1. Развернуть CyberSEO

```text
Запусти навык CyberSEO.

Открой cyberseo-full/SKILL.md.
Создай или прочитай файл cyberseo.deploy.yml.
Если файла нет, создай его по шаблону из cyberseo-full/assets/cyberseo.deploy.yml.

Дальше запусти внутренний навык cyberseo-deploy.
Твоя задача: развернуть или обновить CyberSEO на сервере.

Сначала проверь, каких данных не хватает:
- license_key
- ssh_host
- dashboard_domain
- wordpress_domain
- client_api.url
- client_api.admin_token

Спрашивай только недостающие данные.
Если нужно скачать закрытый архив, используй:
GET https://api.comandos.ai/skill-runtime/artifacts/cyberseo-deploy/latest
и передай ключ только в заголовке X-License-Key.

После установки проверь client-api /healthz и напиши короткий отчёт: что поднято, какие адреса работают, чего не хватает.
```

## Команда 2. Заполнить настройки и промпты

```text
Запусти навык CyberSEO и открой cyberseo.deploy.yml.

Нужно заполнить настройки проекта и промпты, которые потом будут передаваться с каждой темой.

Проверь и помоги заполнить:
- prompts.writer_style_prompt
- prompts.image_style_prompt
- prompts.img_url
- topics.niche
- topics.country_code
- topics.country
- topics.city
- topics.count
- topics.category_hint
- topics.primary_offer_id
- keys.perplexity_api_key, если нужен запасной поиск для узких тем
- keys.firecrawl_api_key, если нужен глубокий анализ конкурентов
- notifications.telegram_bot_token и notifications.telegram_chat_id, если нужны уведомления

Не выдумывай ключи, токены и ссылки.
Если данных нет, спроси.
Если я скажу “без этого”, запиши пустое значение или false и больше не спрашивай.

В конце покажи, какие поля заполнены, а какие остались пустыми.
```

## Команда 3. Встроить настройки и промпты в CyberSEO

```text
Запусти навык CyberSEO.

Открой cyberseo.deploy.yml.
Возьми client_api.url и client_api.admin_token.

Импортируй настройки и промпты в CyberSEO через API.

Сначала подключи лицензию:
POST /api/v1/license/connect

Потом сохрани настройки через:
POST /api/v1/settings

Сохрани как настройки:
- default_country_code
- default_country
- default_city
- default_language_mode
- default_language
- writer_style_prompt
- image_style_prompt
- img_url
- telegram_notify_enabled

Секреты сохраняй только через:
POST /api/v1/secrets

Секреты:
- license_key
- wordpress_url
- wordpress_username
- wordpress_app_password
- openrouter_api_key
- perplexity_api_key
- telegram_bot_token
- telegram_chat_id
- yandex_search_api_key
- yandex_folder_id

После импорта проверь:
GET /api/v1/settings
GET /api/v1/secrets

Полные секреты не печатай.
В конце напиши, какие настройки и секреты успешно сохранены.
```

## Команда 4. Найти и импортировать темы

```text
Запусти навык CyberSEO.

Открой cyberseo.deploy.yml.
Запусти внутренний навык cyberseo-topic-research.

Нужно найти темы для блога, убрать дубли и импортировать их в очередь CyberSEO.

Сначала прочитай:
GET /api/v1/queue
GET /api/v1/published

Потом собери темы по структуре:
- главная тема: topic_role=pillar
- подтема: topic_role=support
- у подтемы parent_topic_id должен указывать на topic_id главной темы
- cluster_id у подтем должен быть равен topic_id главной темы

Не импортируй дубли.
Сначала подготовь:
- topic-map.md
- import-rows.json
- import-report.md

Покажи мне список тем перед импортом.
Если я подтвержу, импортируй через:
POST /api/v1/queue/batch

В конце напиши, сколько тем добавлено, сколько пропущено как дубли и какие темы не подошли.
```

