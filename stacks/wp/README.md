# Comandos Engine v2.0 (WordPress)

Легкий установочный шаблон для WordPress‑витрины без Next.js.

## Что внутри
- `setup.sh` — установщик
- `docker-compose.yml.j2` — шаблон с плейсхолдерами домена
- `comandos-wp.css` — стили для WordPress (таблицы/блоки)
- `snapshot/` — полный клон сайта (опционально)

## Быстрый старт (Установка одной командой)
```bash
curl -sSL https://raw.githubusercontent.com/Comandosai/comandos-deploy-hub/main/wp-stack/setup.sh | bash
```

*Для установки не требуется наличие Git. Достаточно Docker и Curl.*

## Восстановление полного сайта из snapshot
По умолчанию установщик делает **чистый WordPress** и ставит тему + плагины.

Если нужно восстановить полный клон, включите режим snapshot:
```bash
COMANDOS_RESTORE_SNAPSHOT=true \
curl -sSL https://raw.githubusercontent.com/Comandosai/comandos-deploy-hub/main/wp-stack/setup.sh | bash
```

Если в `snapshot/` лежат файлы:
- `snapshot/wordpress_data.tar.gz` — архив с полной файловой системой WordPress
- `snapshot/wordpress_db.sql.gz` — дамп базы данных

то установщик автоматически восстановит сайт 1:1 (файлы, плагины, темы, настройки).

### Для удалённой установки
Перед запуском задайте переменные окружения:
```bash
COMANDOS_RESTORE_SNAPSHOT=true \
COMANDOS_SNAPSHOT_URL="https://your-host/wordpress_data.tar.gz" \
COMANDOS_SNAPSHOT_DB_URL="https://your-host/wordpress_db.sql.gz" \
curl -sSL https://raw.githubusercontent.com/Comandosai/comandos-deploy-hub/main/wp-stack/setup.sh | bash
```

Чтобы выполнить обычную установку темы без восстановления — не задавайте `COMANDOS_RESTORE_SNAPSHOT=true`.

## Что будет в чистой установке
- WordPress последней версии (официальный образ)
- Тема **Comandos AI Blog**
- Плагины (установлены и активированы):
  - Yoast SEO
  - WPGraphQL
  - IndexNow
  - Add WPGraphQL SEO
- Никаких статей/страниц/комментариев (пустая база)

## Вопросы установщика
- WP Domain (пример: `blog.mysite.com`)
- SSL Email

## Подключение стилей (comandos-wp.css)
В активной теме WordPress добавьте в `functions.php`:
```php
add_action('wp_enqueue_scripts', function() {
    wp_enqueue_style('comandos-styles', get_template_directory_uri() . '/comandos-wp.css');
});

add_action('after_setup_theme', function() {
    add_editor_style('comandos-wp.css');
});
```

## Примечания
- Установщик копирует шаблоны в текущую папку и генерирует `.env` и `docker-compose.yml`.
