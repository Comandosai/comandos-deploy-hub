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

После установки открой:
~/.codex/skills/cyberseo-full/README.md

Дальше выполняй команды из README по очереди.
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

## Команда 1. Создать файл проекта

```text
Запусти навык CyberSEO.

Открой cyberseo-full/SKILL.md.

Создай в текущей папке файл cyberseo.project.yml по шаблону:
~/.codex/skills/cyberseo-full/assets/cyberseo.project.yml

Ничего не разворачивай.
Никакие ключи не выдумывай.
Просто создай файл и скажи, какие поля человеку нужно заполнить руками.
Не создавай .cyberseo.state.yml и другие YAML-файлы состояния.

После создания файла остановись.
```

## Команда 2. Помочь заполнить профиль сайта

```text
Запусти навык CyberSEO.

Открой cyberseo.project.yml.
Открой cyberseo-full/SKILL.md.

Помоги заполнить SEO/GEO-профиль сайта до развёртывания WordPress.

Ничего не разворачивай.
Ничего не импортируй.

Используй уже заполненные поля:
- domains.wordpress;
- topics.main_topic;
- topics.country;
- topics.city;
- topics.language;
- site.site_title;
- site.site_description;
- site.blog_title;
- site.blog_description;
- site.about_blog.

Если данных мало, задай короткие вопросы:
- что продаём или о чём сайт;
- город или регион;
- для кого сайт;
- чем отличается предложение;
- какой стиль нужен.

С точки зрения SEO и ИИ-поиска заполни в cyberseo.project.yml:
- site.site_title;
- site.site_description;
- site.blog_title;
- site.blog_description;
- site.about_blog;
- topics.main_topic;
- topics.language;
- prompts.writer_style_prompt;
- prompts.image_style_prompt.

Сделай так, чтобы WordPress потом сразу развернулся с нормальным названием, описанием сайта, описанием блога и блоком "О блоге".

После обновления файла остановись.
```

## Команда 3. Развернуть WordPress

```text
Запусти навык CyberSEO.

Открой cyberseo.project.yml.
Открой cyberseo-full/SKILL.md.

Разверни WordPress на сервере из cyberseo.project.yml.

WordPress разворачивай только из стека, который лежит внутри навыка:
cyberseo-full/assets/wordpress/cyberseo-publisher-stack

Это специализированная сборка под CyberSEO.
Не ставь WordPress вручную с официального сайта, не используй wp-next-stack и не используй общий stacks/wp.

Скопируй папку cyberseo-full/assets/wordpress/cyberseo-publisher-stack на сервер и запускай её setup.sh.
Если запускаешь setup.sh напрямую с GitHub до слияния ветки, передай:
COMANDOS_GITHUB_BRANCH=codex/cyberseo-skills

Сделай:
- проверь SSH-доступ;
- поставь WordPress на домен domains.wordpress;
- создай администратора WordPress;
- если wordpress.admin_username пустой, используй нормальный стандартный логин;
- если пароль пустой, сгенерируй пароль сам;
- создай пароль приложения WordPress;
- загрузи логотип, если site.logo_path заполнен;
- загрузи favicon, если site.favicon_path заполнен;
- заполни название сайта, описание сайта, название блога, описание блога и блок "О блоге", если эти поля заполнены;
- выстави язык WordPress по topics.language, а если он пустой — по topics.country;
- запиши созданные WordPress-доступы в cyberseo.project.yml, блок state.wordpress.

Полные пароли покажи только в финальном отчёте один раз.
Ничего не выдумывай за пользователя, кроме технических паролей, которые сам создаёшь.
Не создавай .cyberseo.state.yml.
```

## Команда 4. Развернуть CyberSEO

```text
Запусти навык CyberSEO.

Открой cyberseo.project.yml.
Открой cyberseo-full/SKILL.md.

Разверни CyberSEO на сервере.

Сделай:
- проверь лицензионный ключ license.cyberseo_key;
- скачай закрытый архив CyberSEO только с заголовком X-License-Key;
- разверни client-api, client-worker, client-web;
- свяжи CyberSEO с WordPress из cyberseo.project.yml, блок state.wordpress;
- подключи лицензию;
- сохрани ключи KIE, Perplexity, Firecrawl и Telegram в секреты CyberSEO, если они заполнены;
- проверь client-api /healthz;
- запиши адрес панели, адрес API, админ-токен и технические статусы в cyberseo.project.yml, блок state.cyberseo.

Не создавай .cyberseo.state.yml.
Все служебные данные должны жить в одном файле cyberseo.project.yml внутри блока state.
```

## Команда 5. Доработать профиль и промпты

```text
Запусти навык CyberSEO.

Открой cyberseo.project.yml.

Нужно доработать профиль сайта и промпты после развёртывания.

Проверь поля:
- site.site_title
- site.site_description
- site.blog_title
- site.blog_description
- site.about_blog
- site.reference_image_path
- topics.main_topic
- topics.country
- topics.city
- topics.language
- prompts.writer_style_prompt
- prompts.image_style_prompt

Если поле пустое или слабое, спроси у человека или предложи вариант на основе уже заполненного контекста.
Если человек говорит "оставь пустым", не спрашивай повторно.

Сохрани результат обратно в cyberseo.project.yml.
Пока ничего не импортируй.
```

## Команда 6. Найти темы

```text
Запусти навык CyberSEO.

Открой cyberseo.project.yml.
Запусти внутренний навык cyberseo-topic-research.

Нужно найти темы для блога.

Используй:
- topics.main_topic;
- topics.country;
- topics.city;
- topics.language;
- topics.count;
- site.blog_description;
- site.about_blog;
- keys.firecrawl_api_key, если заполнен;
- keys.perplexity_api_key, если заполнен.

Сначала прочитай текущую очередь и опубликованные статьи CyberSEO через API из cyberseo.project.yml, блок state.cyberseo:
GET /api/v1/queue
GET /api/v1/published

Собери темы:
- главные темы: topic_role=pillar;
- подтемы: topic_role=support;
- у подтемы parent_topic_id указывает на topic_id главной темы;
- cluster_id у подтем равен topic_id главной темы.

Не импортируй темы сразу.
Сохрани результат в cyberseo.project.yml, блок state.topics:
- state.topics.generated;
- state.topics.rows;
- state.topics.report.

Не создавай cyberseo.topics.yml, import-rows.json и другие отдельные файлы.

В конце покажи список тем и спроси подтверждение на импорт.
```

## Команда 7. Импортировать всё

```text
Запусти навык CyberSEO.

Открой:
- cyberseo.project.yml

Импортируй всё, что подготовлено:

1. В WordPress:
- название сайта;
- описание сайта;
- название блога;
- описание блога;
- блок "О блоге";
- логотип;
- favicon;
- референсную картинку, если она ещё не загружена.

2. В CyberSEO:
- лицензию;
- WordPress URL, логин и пароль приложения;
- KIE API key;
- Perplexity API key;
- Firecrawl API key, если есть поддержка сохранения;
- Telegram bot token и chat_id, если оба заполнены;
- writer_style_prompt;
- image_style_prompt;
- img_url / reference_image_url.

3. В очередь CyberSEO:
- темы из cyberseo.project.yml, блок state.topics.rows, через POST /api/v1/queue/batch.

После импорта проверь:
GET /api/v1/settings
GET /api/v1/secrets
GET /api/v1/queue

Полные секреты не печатай.
В конце напиши, что именно импортировано и что осталось не заполнено.
```
