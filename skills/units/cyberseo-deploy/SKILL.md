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

## WordPress-профиль

Если нужно развернуть или обновить WordPress для CyberSEO, использовать только стек из общего навыка `cyberseo-full/assets/wordpress/cyberseo-publisher-stack`.

При запуске `setup.sh` передать значения из `cyberseo.project.yml`:

- `site.site_title` -> `COMANDOS_WP_SITE_TITLE`;
- `site.site_description` -> `COMANDOS_WP_SITE_DESCRIPTION`;
- `site.blog_title` -> `COMANDOS_WP_BLOG_TITLE`;
- `site.blog_description` -> `COMANDOS_WP_BLOG_DESCRIPTION`;
- `site.about_blog` -> `COMANDOS_WP_ABOUT_BLOG`.

После установки проверить не только обычные поля WordPress, но и настройки темы:

- `blogname`;
- `blogdescription`;
- `get_theme_mod('blog_title')`;
- `get_theme_mod('blog_description')`;
- `get_theme_mod('about_blog')`.

Эти поля не должны оставаться на ручную правку в кастомайзере.

Также поставить для администратора WordPress галочку Yoast SEO “Не разрешайте поисковым системам отображать архивы этого автора в результатах поиска”. Технически это `user meta wpseo_noindex_author = on`.

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
9. Через локальный `client-api` сохранить адрес Central API в `/api/v1/site`.
10. Сразу подключить тот же ключ из `license.cyberseo_key` через `POST /api/v1/license/connect`.
11. Если ключ не подключился, считать развёртывание незавершённым и показать понятную ошибку.
12. Сохранить адрес API, логин панели, пароль панели, админ-токен и статусы в `state.cyberseo`.
13. Если API уже доступен, импортировать настройки и секреты через API.
14. Обновить `cyberseo.project.yml`.
15. Сделать короткий отчёт.

## Доступ к панели

Панель CyberSEO не должна открываться с заранее вписанными логином и паролем.
Нельзя использовать демо-доступы вроде `admin123` или запасной демо-вход.

Если логин и пароль панели созданы при развёртывании, записать их в `cyberseo.project.yml -> state.cyberseo`.
Показать полный пароль можно только один раз в финальном отчёте.

## Лицензия при развёртывании

Ключ `license.cyberseo_key` нужно не только записать в `.env`, но и подключить через локальный API панели:

```text
POST /api/v1/license/connect
Authorization: Bearer <state.cyberseo.admin_token>
```

Тело:

```json
{
  "license_key": "<license.cyberseo_key>"
}
```

После успешного ответа записать `state.cyberseo.license_connected=true`.
Если Central API вернул ошибку, не писать, что CyberSEO полностью готов.

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
