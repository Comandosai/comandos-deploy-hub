# Навыки отдела продаж

В репе рядом лежат пять отдельных навыков, которые можно запускать независимо или по порядку.

Общие файлы:
- [PORYADOK_ZAPUSKA_OTDELA_PRODAZH.md](/Users/artemlahtin/Documents/comandos-deploy-hub/skills/PORYADOK_ZAPUSKA_OTDELA_PRODAZH.md)
- [DANNYE_DLYA_RAZVERTYVANIYA.md](/Users/artemlahtin/Documents/comandos-deploy-hub/skills/DANNYE_DLYA_RAZVERTYVANIYA.md)
- [KONTEXT_VNEDRENIYA_OTDELA_PRODAZH.md](/Users/artemlahtin/Documents/comandos-deploy-hub/skills/KONTEXT_VNEDRENIYA_OTDELA_PRODAZH.md)

## 0. Полный запуск отдела продаж

Папка:
- [polnyy-zapusk-otdela-prodazh](/Users/artemlahtin/Documents/comandos-deploy-hub/skills/polnyy-zapusk-otdela-prodazh)

Назначение:
- читать общий ввод и общий контекст проекта;
- понимать, какой этап уже сделан;
- пропускать завершенные этапы;
- предлагать только следующий релевантный шаг;
- вести пользователя через все остальные навыки как через один большой проект.

## 1. Векторизация и загрузка базы

Папка:
- [vektorizaciya-i-zagruzka-bazy](/Users/artemlahtin/Documents/comandos-deploy-hub/skills/vektorizaciya-i-zagruzka-bazy)

Назначение:
- разобрать сырые документы;
- собрать `__workspace`;
- создать `products_live`;
- отправить данные в runtime API;
- загрузить знания и товары в `Supabase`.

## 2. Подключение отдела продаж

Папка:
- [podklyuchenie-otdela-prodazh](/Users/artemlahtin/Documents/comandos-deploy-hub/skills/podklyuchenie-otdela-prodazh)

Назначение:
- найти `Supabase`;
- найти `n8n`;
- импортировать workflow;
- создать и привязать соединения;
- подключить `MCP`;
- поставить тестового агента проверки базы;
- при необходимости включить Telegram-тестирование.

## 3. Развертывание и обновление n8n

Папка:
- [razvertyvanie-i-obnovlenie-n8n](/Users/artemlahtin/Documents/comandos-deploy-hub/skills/razvertyvanie-i-obnovlenie-n8n)

Назначение:
- запросить доступ к серверу;
- проверить, установлен ли `n8n`;
- если `n8n` найден, спросить, нужно ли обновление;
- если `n8n` не найден, развернуть новый экземпляр через `n8n-stack-v2`;
- запросить домен, почту для SSL, пароль администратора и `x-license-key`, если они не найдены автоматически;
- привести инсталляцию к рабочему состоянию и сделать итоговую проверку.

## 4. Telegram-тестирование бота

Папка:
- [telegram-testirovanie-bota](/Users/artemlahtin/Documents/comandos-deploy-hub/skills/telegram-testirovanie-bota)

Назначение:
- поставить зависимости для `Telethon`;
- поднять локальную пользовательскую Telegram-сессию;
- собрать контекст из папки клиента;
- провести серию живых тестов с ботом;
- сохранить отчет по качеству ответов.

## Рекомендуемый порядок

1. Сначала использовать навык `Развертывание и обновление n8n`, если `n8n` еще не установлен или требует обновления.
2. Потом использовать навык `Векторизация и загрузка базы`.
3. После этого использовать навык `Подключение отдела продаж`.
4. После этого запускать `Telegram-тестирование бота` для живой проверки ответов.
5. В конце фиксировать отчет и список исправлений.
