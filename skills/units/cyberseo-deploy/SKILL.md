---
name: Развёртывание CyberSEO
description: Разворачивает или обновляет CyberSEO у клиента через один файл cyberseo.project.yml, проверяет лицензию, скачивает закрытый архив с api.comandos.ai, настраивает client-api, client-worker, client-web, связь с WordPress, ключи и делает итоговую проверку.
---

# Развёртывание CyberSEO

Навык нужен для установки или обновления CyberSEO у клиента.

## Что читать

1. `cyberseo.project.yml`.
2. Если `cyberseo.project.yml` нет, создать его по структуре из [references/config-contract.md](references/config-contract.md) и остановиться.
3. [Контракт импорта настроек](references/settings-import-contract.md).

Отдельный `.cyberseo.state.yml` не создавать. Все созданные доступы, токены и статусы писать в блок `state` внутри `cyberseo.project.yml`.

## Что должно быть заполнено

Обязательное:

- `license.cyberseo_key`;
- `server.ssh_host`;
- `domains.cyberseo_panel`.

Желательное:

- `domains.wordpress`;
- WordPress-доступы в `state.wordpress`;
- `keys.kie_api_key`, если пользователь хочет свой баланс KIE / Krea AI;
- `keys.perplexity_api_key`, если пользователь хочет свой баланс Perplexity;
- Telegram bot token и chat id, если нужны уведомления;
- промпт писателя;
- промпт художника;
- референс изображения.

Если пользователь говорит “без этого”, не спорить, оставить пустым и продолжить, если шаг возможен.

## Закрытый архив

Закрытые файлы скачивать только после проверки лицензии:

```text
GET https://api.comandos.ai/skill-runtime/artifacts/cyberseo-deploy/latest
X-License-Key: <license.cyberseo_key>
```

Ответы:

- `401` — ключ не передан;
- `403` — лицензия неактивна или нет продукта CyberSEO;
- `404` — доступ есть, но архив ещё не положен на сервер;
- `200` — архив можно распаковывать.

Ключ не передавать в адресной строке и не печатать полностью.

## Порядок работы

1. Прочитать `cyberseo.project.yml`.
2. Проверить SSH-доступ.
3. Скачать закрытый архив.
4. Распаковать архив во временную папку.
5. Выполнить инструкции из архива.
6. Проверить, что подняты `client-api`, `client-worker`, `client-web`.
7. Проверить `/healthz` у `client-api`.
8. Связать CyberSEO с WordPress, если WordPress уже развёрнут.
9. Сохранить адрес API, админ-токен и статусы в `state.cyberseo`.
10. Если API уже доступен, импортировать лицензию, настройки и секреты через API.
11. Обновить `cyberseo.project.yml`.
12. Сделать короткий отчёт.

## Настройки и промпты

Если адрес API и админ-токен уже есть в `state.cyberseo`, сохранить:

- `default_country`;
- `default_city`;
- `default_language_mode`;
- `default_language`;
- `writer_style_prompt`;
- `image_style_prompt`;
- `img_url`;
- `telegram_notify_enabled`.

Секреты сохранять через `/api/v1/secrets`, а не в обычные настройки.

Telegram включать автоматически: если `telegram.bot_token` и `telegram.chat_id` заполнены, сохранить `telegram_notify_enabled=true`; иначе `false`.

Если `topics.language` заполнен, сохранить `default_language_mode=fixed` и `default_language=<topics.language>`.
Если `topics.language` пустой, сохранить `default_language_mode=auto`, а язык пусть выбирается по `topics.country`.

## Проверка

Минимум:

- `client-api /healthz` отвечает;
- лицензия подключена;
- настройки читаются через `GET /api/v1/settings`;
- секреты показывают статус `configured`, но сами значения не раскрываются;
- если WordPress указан, проверен доступ;
- `cyberseo.project.yml -> state` содержит служебные адреса и токены;
- если промпты указаны, они сохранены в настройках.

## Выход

Сообщить:

- что установлено или обновлено;
- какой адрес панели;
- какие ключи настроены по статусу;
- какие поля остались пустыми;
- можно ли переходить к профилю, промптам или поиску тем.
